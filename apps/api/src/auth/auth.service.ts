import { 
  ConflictException, 
  Injectable, 
  UnauthorizedException 
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

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly merchants: MerchantsService,
    private readonly db: DbService,
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

    const refreshTokenId = randomUUID();
    const refreshToken = await this.signRefreshToken({
      ...payload,
      jti: refreshTokenId
    });

    await this.persistRefreshToken(refreshTokenId ,merchant.id, refreshToken);

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

    const refreshTokenId = randomUUID();
    const refreshToken = await this.signRefreshToken({
      ...payload,
      jti: refreshTokenId
    });

    await this.persistRefreshToken(refreshTokenId ,merchant.id, refreshToken);

    return {
      merchant: this.merchants.toPublicMerchant(merchant),
      accessToken,
      refreshToken
    };
  } 

  async refresh(input: RefreshRequest): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(input.refreshToken);

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

    if (storedRefreshToken.expiresAt < new Date()){
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const isRefreshTokenValid = await this.verifySecret(
      storedRefreshToken.tokenHash,
      input.refreshToken
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const merchant = await this.merchants.findById(payload.sub);

    if (!merchant || !merchant.isActive) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const accessToken = await this.signAccessToken({
      sub: merchant.id,
      email: merchant.email
    });

    return {
      merchant: this.merchants.toPublicMerchant(merchant),
      accessToken,
      refreshToken: input.refreshToken
    }
  }

  async logout(input: LogoutRequest): Promise<{success: true}> {
    const payload = await this.verifyRefreshToken(input.refreshToken);

    const rows = await this.db.client
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.id, payload.jti))
      .limit(1);
    
    const storedRefreshToken = rows[0] ?? null;

    if (!storedRefreshToken){
      throw new UnauthorizedException("Invalid refresh token.");
    }

    const isRefreshTokenValid = await this.verifySecret(
      storedRefreshToken.tokenHash,
      input.refreshToken
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException("Invalid refresh token.");
    }

    await this.db.client
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(refreshTokens.id, payload.jti));

    return { success: true };
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

  async verifyAccessToken(accessToken: string) : Promise<AuthTokenPayload> {
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
      throw new UnauthorizedException("Invalid refresh token.")
    }
  }

  private generateSecret(prefix: string): string {
    return `${prefix}_${randomBytes(32).toString("base64url")}`;
  }

  private generateApiKey(): string {
    return this.generateSecret("tg_live");
  }

  private generateRefreshToken(): string {
    return this.generateSecret("rt");
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
}
