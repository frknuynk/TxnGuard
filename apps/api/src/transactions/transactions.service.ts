import { Injectable, Logger } from "@nestjs/common";
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
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import {
  FraudEngineService,
  type FraudRuleResult,
} from "../fraud-engine/fraud-engine.service.js";
import { env } from "../config/env.js";
import { RedisService } from "../redis/redis.service.js";
import { TransactionEventsQueue } from "../queue/transaction-events.queue.js";


type TransactionRow = typeof transactions.$inferSelect;

@Injectable()
export class TransactionsService {
    private readonly logger = new Logger(TransactionsService.name);

    constructor(
        private readonly db: DbService,
        private readonly fraudEngine: FraudEngineService,
        private readonly redis: RedisService,
        private readonly transactionEvents: TransactionEventsQueue,
    ) {}
    

    async createTransaction(
        merchantId: string,
        input: CreateTransactionRequest,
    ): Promise<Transaction> {

        if (input.idempotencyKey) {
            const existing = await this.findByIdempotencyKey(merchantId, input.idempotencyKey);
            if (existing) return this.toPublicTransaction(existing);
        }

        const velocityCount = await this.getVelocityCount(merchantId);
        const fraudDecision = this.fraudEngine.scoreTransaction(input, {
            velocityCount,
            velocityThreshold: env.VELOCITY_THRESHOLD,
            velocityWindowSeconds: env.VELOCITY_WINDOW_SECONDS,
        });

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
                idempotencyKey: input.idempotencyKey,
            })
            .returning();

        const transaction = this.toPublicTransaction(rows[0]!);

        await this.insertFraudEvents(transaction.id, fraudDecision.ruleResults);

        try {
            await this.transactionEvents.publish(transaction);
        } catch (error) {
            this.logger.warn(`Realtime delivery unavailable: ${error instanceof Error ? error.message : String(error)}`);
        }

        return transaction;
    }

    async listTransactions(
        merchantId: string,
        query: ListTransactionsQuery,
    ): Promise<ListTransactionsResponse> {
        const conditions = [eq(transactions.merchantId, merchantId)];
        if (query.status) conditions.push(eq(transactions.status, query.status));
        if (query.severity) conditions.push(eq(transactions.fraudSeverity, query.severity));
        if (query.minScore !== undefined) conditions.push(gte(transactions.fraudScore, query.minScore));
        if (query.maxScore !== undefined) conditions.push(lte(transactions.fraudScore, query.maxScore));
        if (query.from) conditions.push(gte(transactions.createdAt, query.from));
        if (query.to) conditions.push(lte(transactions.createdAt, query.to));
        const where = and(...conditions);

        const [rows, totalRows] = await Promise.all([
          this.db.client
            .select()
            .from(transactions)
            .where(where)
            .orderBy(desc(transactions.createdAt))
            .limit(query.limit)
            .offset(query.offset),
          this.db.client.select({ value: count() }).from(transactions).where(where),
        ]);

        const publicTransactions = rows.map((transaction) =>
            this.toPublicTransaction(transaction),
        );

        return {
            transactions: publicTransactions,
            pagination: {
                limit: query.limit,
                offset: query.offset,
                count: publicTransactions.length,
                total: totalRows[0]?.value ?? 0,
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

        const eventRows = await this.db.client
            .select()
            .from(fraudEvents)
            .where(eq(fraudEvents.transactionId, transaction.id))
            .orderBy(desc(fraudEvents.createdAt));

        return {
            transaction: this.toPublicTransaction(transaction),
            fraudEvents: eventRows.map((event) => ({
                id: event.id,
                ruleKey: event.ruleKey,
                scoreImpact: event.scoreImpact,
                reason: event.reason,
                metadata: event.metadata as Record<string, unknown>,
                createdAt: event.createdAt.toISOString(),
            })),
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

    private async findByIdempotencyKey(merchantId: string, idempotencyKey: string): Promise<TransactionRow | null> {
        const rows = await this.db.client.select().from(transactions).where(and(
            eq(transactions.merchantId, merchantId),
            eq(transactions.idempotencyKey, idempotencyKey),
        )).limit(1);
        return rows[0] ?? null;
    }

    private async getVelocityCount(merchantId: string): Promise<number | undefined> {
        try {
            return await this.redis.incrementWithTtl(
                `fraud:merchant:${merchantId}:tx_count:${env.VELOCITY_WINDOW_SECONDS}s`,
                env.VELOCITY_WINDOW_SECONDS,
            );
        } catch (error) {
            this.logger.warn(`Velocity check unavailable: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }
}
