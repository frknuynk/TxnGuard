import { Injectable } from "@nestjs/common";
import type {
  CreateTransactionRequest,
  FraudSeverity,
  Transaction,
  TransactionStatus,
} from "@txnguard/shared";
import { DbService } from "../db/db.service.js";
import { transactions } from "../db/schema.js";

type TransactionRow = typeof transactions.$inferSelect;

@Injectable()
export class TransactionsService {
    constructor(private readonly db: DbService) {}

    async createTransaction(
        merchantId: string,
        input: CreateTransactionRequest,
    ): Promise<Transaction> {
        const rows = await this.db.client
            .insert(transactions)
            .values({
                merchantId,
                amountMinor: input.amountMinor,
                currency: input.currency,
                cardBin: input.cardBin,
                cardCountry: input.cardCountry,
                ipAddress: input.ipAddress,
                ipCountry: input.ipCountry,
            })
            .returning();
        
            return this.toPublicTransaction(rows[0]!);
    }

    private toPublicTransaction(transaction: TransactionRow): Transaction {
        return {
            id: transaction.id,
            merchantId: transaction.merchantId,
            amountMinor: transaction.amountMinor,
            currency: transaction.currency,
            cardBin: transaction.cardBin,
            cardCountry: transaction.cardCountry,
            ipAddress: transaction.ipAddress,
            ipCountry: transaction.ipCountry,
            fraudScore: transaction.fraudScore,
            fraudSeverity: transaction.fraudSeverity as FraudSeverity,
            fraudReasons: transaction.fraudReasons as string[],
            fraudMetadata: transaction.fraudMetadata as Record<string, unknown>,
            status: transaction.status as TransactionStatus,
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString(),
        };
    }
}
