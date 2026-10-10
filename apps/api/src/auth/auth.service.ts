import { 
  ConflictException, 
  HttpException,
  HttpStatus,
  Injectable, 
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { 
  AuthResponse, 
  LoginRequest,
  LogoutRequest, 
  RefreshRequest, 
  RegisterRequest, 
  RegisterResponse,
 } from "@txnguard/shared";
import argon2 from "argon2";
import type { StringValue } from "ms";
import { randomBytes, randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { eq } from "drizzle-orm";
import { DbService } from "../db/db.service.js";
import { refreshTokens } from "../db/schema.js";
import { MerchantsService } from "../merchants/merchants.service.js";
import { RedisService } from "../redis/redis.service.js";

type AuthTokenPayload = {
  sub: string;
  email: string;
};

type RefreshTokenPayload = AuthTokenPayload & {
  jti: string;
};

type VerifiedRefreshTokenPayload = RefreshTokenPayload & {
  iat: number;
  exp: number;
};

type StoredRefreshToken = typeof refreshTokens.$inferSelect;

type ValidRefreshToken = {
  payload: VerifiedRefreshTokenPayload;
  storedRefreshToken: StoredRefreshToken; 
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly merchants: MerchantsService,
    private readonly db: DbService,
    private readonly redis: RedisService,
  ) {}

  async register(input: RegisterRequest): Promise<RegisterResponse> {
    const existingMerchant = await this.merchants.findByEmail(input.email);

    if (existingMerchant) {
      throw new ConflictException("Merchant with this email already exists");
    }

    const passwordHash = await this.hashSecret(input.password);

    const apiKey = this.generateApiKey();
    const apiKeyHash = await this.hashSecret(apiKey);

    const merchant = await this.merchants.createMerchant({
      name: input.name,
      email: input.email,
      passwordHash,
      apiKeyHash,
    });

    const payload: AuthTokenPayload = {
      sub: merchant.id,
      email: merchant.email,
    };

    const accessToken = await this.signAccessToken(payload);

    const refreshToken = await this.createRefreshToken(merchant.id, payload);

    return {
      merchant: this.merchants.toPublicMerchant(merchant),
      accessToken,
      refreshToken,
      apiKey,
    };
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const merchant = await this.merchants.findByEmail(input.email);

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const isPasswordValid = await this.verifySecret(
      merchant.passwordHash,
      input.password
    );

    if (!isPasswordValid) {
        throw new UnauthorizedException("Invalid email or password.");
    }

    const payload:AuthTokenPayload = {
      sub: merchant.id,
      email: merchant.email
    };

    const accessToken = await this.signAccessToken(payload);

    const refreshToken = await this.createRefreshToken(merchant.id, payload);

    return {
      merchant: this.merchants.toPublicMerchant(merchant),
      accessToken,
      refreshToken
    };
  } 

  async refresh(input: RefreshRequest): Promise<AuthResponse> {
    const { payload, storedRefreshToken } = await this.getValidRefreshToken(input.refreshToken);

    const merchant = await this.merchants.findById(payload.sub);

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    await this.db.client.update(refreshTokens).set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(refreshTokens.id, storedRefreshToken.id));

    const tokenPayload = {
      sub: merchant.id,
      email: merchant.email
    };
    const accessToken = await this.signAccessToken(tokenPayload);
    const refreshToken = await this.createRefreshToken(merchant.id, tokenPayload);

    return {
      merchant: this.merchants.toPublicMerchant(merchant),
      accessToken,
      refreshToken,
    }
  }

  async logout(input: LogoutRequest): Promise<{success: true}> {
    const { payload } = await this.getValidRefreshToken(input.refreshToken);

    await this.db.client
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refreshTokens.id, payload.jti));

    return { success: true };
  }

  async rotateApiKey(merchantId: string): Promise<{ apiKey: string }> {
    let rateLimit: { count: number; retryAfterSeconds: number };
    try {
      rateLimit = await this.redis.consumeFixedWindow(
        `auth:merchant:${merchantId}:api-key-rotation`,
        env.API_KEY_ROTATION_WINDOW_SECONDS,
      );
    } catch {
      throw new ServiceUnavailableException("API key rotation is temporarily unavailable. Please try again shortly.");
    }

    if (rateLimit.count > env.API_KEY_ROTATION_LIMIT) {
      const waitMinutes = Math.max(1, Math.ceil(rateLimit.retryAfterSeconds / 60));
      throw new HttpException(
        `API key rotation limit reached. Try again in ${waitMinutes} minute${waitMinutes === 1 ? "" : "s"}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const apiKey = this.generateApiKey();
    const apiKeyHash = await this.hashSecret(apiKey);

    const merchant = await this.merchants.updateApiKeyHash(
      merchantId,
      apiKeyHash,
    );

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException("Invalid merchant");
    }

    return { apiKey };
  }

  private hashSecret(value: string): Promise<string> {
    return argon2.hash(value);
  }

  private verifySecret(hash: string, value: string): Promise<boolean> {
    return argon2.verify(hash, value);
  }

  private async signAccessToken(payload: AuthTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as StringValue,
    });
  }

  private async signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as StringValue,
    });
  }

  async verifyAccessToken(accessToken: string): Promise<AuthTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AuthTokenPayload>(accessToken, {
        secret: env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Invalid access token.");
    }
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<VerifiedRefreshTokenPayload> {
    try {
      return await this.jwt.verifyAsync<VerifiedRefreshTokenPayload>(
        refreshToken,
        {
          secret: env.JWT_REFRESH_SECRET,
        },
      );
    } catch {
      throw new UnauthorizedException("Invalid refresh token.");
    }
  }

  private generateSecret(prefix: string): string {
    return `${prefix}_${randomBytes(32).toString("base64url")}`;
  }

  private generateApiKey(): string {
    return this.generateSecret("tg_live");
  }

  private async persistRefreshToken(
    tokenId: string,
    merchantId: string,
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = await this.hashSecret(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.client.insert(refreshTokens).values({
      id: tokenId,
      merchantId,
      tokenHash,
      expiresAt,
    });
  }

  private async createRefreshToken(
    merchantId: string,
    payload: AuthTokenPayload,
  ): Promise<string> {
    const refreshTokenId = randomUUID();

    const refreshToken = await this.signRefreshToken({
      ...payload,
      jti: refreshTokenId,
    });

    await this.persistRefreshToken(refreshTokenId, merchantId, refreshToken);

    return refreshToken;
  }

  private async getValidRefreshToken(
    refreshToken: string,
  ): Promise<ValidRefreshToken> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const rows = await this.db.client
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, payload.jti))
      .limit(1);

    const storedRefreshToken = rows[0] ?? null;

    if (!storedRefreshToken) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (storedRefreshToken.revokedAt) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    if (storedRefreshToken.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const isRefreshTokenValid = await this.verifySecret(
      storedRefreshToken.tokenHash,
      refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    return {
      payload,
      storedRefreshToken,
    };
  }
}
