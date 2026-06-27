import { ConflictException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { RegisterRequest, RegisterResponse } from "@txnguard/shared";
import argon2 from "argon2";
import type { StringValue } from "ms";
import { randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { DbService } from "../db/db.service.js";
import { refreshTokens } from "../db/schema.js";
import { MerchantsService } from "../merchants/merchants.service.js";

type AuthTokenPayload = {
  sub: string;
  email: string;
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
    const refreshToken = await this.signRefreshToken(payload);

    await this.persistRefreshToken(merchant.id, refreshToken);

    return {
      merchant: this.merchants.toPublicMerchant(merchant),
      accessToken,
      refreshToken,
      apiKey,
    };
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

  private async signRefreshToken(payload: AuthTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as StringValue,
    });
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
    merchantId: string,
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = await this.hashSecret(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.db.client.insert(refreshTokens).values({
      merchantId,
      tokenHash,
      expiresAt,
    });
  }
}
