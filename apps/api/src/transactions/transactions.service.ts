import { Injectable } from "@nestjs/common";
import type {
  CreateTransactionRequest,
  FraudSeverity,
  GetTransactionResponse,
  ListTransactionsQuery,
  ListTransactionsResponse,
  Transaction,
  TransactionStatus,
} from "@txnguard/shared";
import { DbService } from "../db/db.service.js";
import { fraudEvents, transactions } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";
import {
  FraudEngineService,
  type FraudRuleResult,
} from "../fraud-engine/fraud-engine.service.js";


type TransactionRow = typeof transactions.$inferSelect;

@Injectable()
export class TransactionsService {
    constructor(
        private readonly db: DbService,
        private readonly fraudEngine: FraudEngineService,
    ) {}
    

    async createTransaction(
        merchantId: string,
        input: CreateTransactionRequest,
    ): Promise<Transaction> {

        const fraudDecision = this.fraudEngine.scoreTransaction(input);

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
                fraudScore: fraudDecision.score,
                fraudSeverity: fraudDecision.severity,
                fraudReasons: fraudDecision.reasons,
                fraudMetadata: fraudDecision.metadata,
                status: fraudDecision.status,
            })
            .returning();

        const transaction = this.toPublicTransaction(rows[0]!);

        await this.insertFraudEvents(transaction.id, fraudDecision.ruleResults);

        return transaction;
    }

    async listTransactions(
        merchantId: string,
        query: ListTransactionsQuery,
    ): Promise<ListTransactionsResponse> {
        const rows = await this.db.client
            .select()
            .from(transactions)
            .where(eq(transactions.merchantId, merchantId))
            .orderBy(desc(transactions.createdAt))
            .limit(query.limit)
            .offset(query.offset);

        const publicTransactions = rows.map((transaction) =>
            this.toPublicTransaction(transaction),
        );

        return {
            transactions: publicTransactions,
            pagination: {
                limit: query.limit,
                offset: query.offset,
                count: publicTransactions.length,
            },
        };
    }

    async findTransactionById(
        merchantId: string,
        transactionId: string,
    ): Promise<GetTransactionResponse | null> {
        const rows = await this.db.client
            .select()
            .from(transactions)
            .where(
                and(
                    eq(transactions.id, transactionId),
                    eq(transactions.merchantId, merchantId),
                ),
            )
            .limit(1);

        const transaction = rows[0] ?? null;

        if (!transaction) {
            return null;
        }

        return {
            transaction: this.toPublicTransaction(transaction),
        };
    }

    private async insertFraudEvents(
        transactionId: string,
        ruleResults: FraudRuleResult[],
    ): Promise<void> {
        if (ruleResults.length === 0) {
            return;
        }

        await this.db.client.insert(fraudEvents).values(
            ruleResults.map((rule) => ({
                transactionId,
                ruleKey: rule.key,
                scoreImpact: rule.scoreImpact,
                reason: rule.reason,
                metadata: rule.metadata,
            })),
        );
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
