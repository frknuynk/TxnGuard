import argon2 from "argon2";
import { Injectable } from "@nestjs/common";
import type { CurrentMerchant } from "@txnguard/shared";
import { eq } from "drizzle-orm";
import { DbService } from "../db/db.service.js";
import { merchants } from "../db/schema.js";

type MerchantRow = typeof merchants.$inferSelect;
type CreateMerchantInput = {
    name: string;
    email: string;
    passwordHash: string;
    apiKeyHash: string;
};

@Injectable()
export class MerchantsService {
    constructor(private readonly db: DbService) {}

    async findByEmail(email: string): Promise<MerchantRow | null> {
        const rows = await this.db.client
            .select()
            .from(merchants)
            .where(eq(merchants.email, email))
            .limit(1);
        
            return rows[0] ?? null;
    }

    async findById(id: string): Promise<MerchantRow | null> {
        const rows = await this.db.client
            .select()
            .from(merchants)
            .where(eq(merchants.id, id))
            .limit(1);

        return rows[0] ?? null;
    }

    async findActiveMerchantByApiKey(apiKey: string): Promise<MerchantRow | null> {
        const activeMerchants = await this.db.client
            .select()
            .from(merchants)
            .where(eq(merchants.isActive, true));

            //API KEY are stored as salted hashes, so each active mercahnt hash must be verified.
            for (const merchant of activeMerchants) {
                const isApiKeyValid = await argon2.verify(merchant.apiKeyHash, apiKey);

                if (isApiKeyValid) {
                    return merchant;
                }
            }

            return null;
    }

    async createMerchant(input: CreateMerchantInput): Promise<MerchantRow> {
        const rows = await this.db.client
            .insert(merchants)
            .values({
                name: input.name,
                email: input.email,
                passwordHash: input.passwordHash,
                apiKeyHash: input.apiKeyHash,
            })
            .returning();
        
            return rows[0]!;
    }

    async updateApiKeyHash(merchantId: string, apiKeyHash: string): Promise<MerchantRow | null> {
        const rows = await this.db.client
            .update(merchants)
            .set({
                apiKeyHash,
                updatedAt: new Date(),
            })
            .where(eq(merchants.id, merchantId))
            .returning();
        
        return rows[0] ?? null;
    }

    async updateProfile(merchantId: string, name: string): Promise<CurrentMerchant | null> {
        const rows = await this.db.client.update(merchants).set({
            name,
            updatedAt: new Date(),
        }).where(eq(merchants.id, merchantId)).returning();

        return rows[0] ? this.toPublicMerchant(rows[0]) : null;
    }

    toPublicMerchant(merchant: MerchantRow): CurrentMerchant {
        return {
            id: merchant.id,
            name: merchant.name,
            email: merchant.email,
            isActive: merchant.isActive,
            createdAt: merchant.createdAt.toISOString(),
            updatedAt: merchant.updatedAt.toISOString(),
        };
    }
}
