import { Injectable } from "@nestjs/common";
import type {
  CreateTransactionRequest,
  FraudSeverity,
  Transaction,
  TransactionStatus,
} from "@txnguard/shared";
import { DbService } from "../db/db.service.js";
import { fraudEvents, transactions } from "../db/schema.js";


type FraudRuleResult = {
    key: string;
    scoreImpact: number;
    reason: string;
    metadata: Record<string, unknown>;
};

type FraudDecision = {
    score: number;
    severity: FraudSeverity;
    status: TransactionStatus;
    reasons: string[];
    metadata: Record<string, unknown>;
    ruleResults: FraudRuleResult[];
};

type TransactionRow = typeof transactions.$inferSelect;

@Injectable()
export class TransactionsService {
    constructor(private readonly db: DbService) {}

    async createTransaction(
        merchantId: string,
        input: CreateTransactionRequest,
    ): Promise<Transaction> {

        const fraudDecision = this.scoreTransaction(input);

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

    private scoreTransaction(input: CreateTransactionRequest): FraudDecision {
        const ruleResults: FraudRuleResult[] = [];

        if (input.cardCountry !== input.ipCountry) {
            ruleResults.push({
                key: "country_mismatch",
                scoreImpact: 30,
                reason: "Card country does not match IP country.",
                metadata: {
                    cardCountry: input.cardCountry,
                    ipCountry: input.ipCountry,
                },
            });
        }

        if (input.amountMinor >= 100000) {
            ruleResults.push({
                key: "high_amount",
                scoreImpact: 25,
                reason: "Transaction amount is high.",
                metadata: {
                    amountMinor: input.amountMinor,
                    thresholdMinor: 100000,
                },
            });
        }

        const score = Math.min(
            100,
            ruleResults.reduce((total, rule) => total + rule.scoreImpact, 0),
        );

        const severity = this.mapScoreToSeverity(score);
        const status = this.mapScoreToStatus(score);

        return {
            score,
            severity,
            status,
            reasons: ruleResults.map((rule) => rule.key),
            metadata: {
                rules: ruleResults,
            },
            ruleResults,
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

    private mapScoreToSeverity(score: number): FraudSeverity {
        if (score >= 90) return "critical";
        if (score >= 70) return "high";
        if (score >= 40) return "medium";
        if (score >= 20) return "low";
        return "none";
    }

    private mapScoreToStatus(score: number): TransactionStatus {
        if (score >= 70) return "declined";
        if (score >= 40) return "flagged";
        return "approved";
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
