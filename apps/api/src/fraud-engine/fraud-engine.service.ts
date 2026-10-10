import { Injectable } from "@nestjs/common";
import {
  FraudSeverityValues,
  TransactionStatusValues,
  type CreateTransactionRequest,
  type FraudSeverity,
  type TransactionStatus,
} from "@txnguard/shared";
import { FraudRules, type FraudRuleKey } from "./fraud-rules.js";


export type FraudRuleResult = {
    key: FraudRuleKey;
    scoreImpact: number;
    reason: string;
    metadata: Record<string, unknown>;
};

export type FraudDecision = {
    score: number;
    severity: FraudSeverity;
    status: TransactionStatus;
    reasons: string[];
    metadata: Record<string, unknown>;
    ruleResults: FraudRuleResult[];
};

export type FraudContext = {
    velocityCount?: number;
    velocityThreshold?: number;
    velocityWindowSeconds?: number;
    evaluatedAt?: Date;
};

@Injectable()
export class FraudEngineService {
    scoreTransaction(input: CreateTransactionRequest, context: FraudContext = {}): FraudDecision {
        const ruleResults: FraudRuleResult[] = [];

        if (input.cardCountry !== input.ipCountry) {
            const rule = FraudRules.CountryMismatch;

            ruleResults.push(
                this.createRuleResult(
                    rule.key,
                    rule.scoreImpact,
                    rule.reason,
                    {
                        cardCountry: input.cardCountry,
                        ipCountry: input.ipCountry,
                    },
                ),
            );
        }

        if (input.amountMinor >= FraudRules.HighAmount.thresholdMinor) {
            const rule = FraudRules.HighAmount;

            ruleResults.push(
                this.createRuleResult(
                    rule.key,
                    rule.scoreImpact,
                    rule.reason,
                    {
                        amountMinor: input.amountMinor,
                        thresholdMinor: rule.thresholdMinor,
                    },
                ),
            );
        }


        if (
            context.velocityCount !== undefined &&
            context.velocityThreshold !== undefined &&
            context.velocityCount > context.velocityThreshold
        ) {
            const rule = FraudRules.MerchantVelocity;
            ruleResults.push(this.createRuleResult(rule.key, rule.scoreImpact, rule.reason, {
                count: context.velocityCount,
                threshold: context.velocityThreshold,
                windowSeconds: context.velocityWindowSeconds,
            }));
        }

        const evaluatedAt = context.evaluatedAt ?? new Date();
        const hour = evaluatedAt.getUTCHours();
        const nightRule = FraudRules.NightTimeHighValue;
        if (
            input.amountMinor >= nightRule.thresholdMinor &&
            hour >= nightRule.startHourUtc &&
            hour < nightRule.endHourUtc
        ) {
            ruleResults.push(this.createRuleResult(nightRule.key, nightRule.scoreImpact, nightRule.reason, {
                amountMinor: input.amountMinor,
                evaluatedHourUtc: hour,
                thresholdMinor: nightRule.thresholdMinor,
            }));
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
                velocityAvailable: context.velocityCount !== undefined,
            },
            ruleResults,
        };
    }

    private createRuleResult(
        key: FraudRuleKey,
        scoreImpact: number,
        reason: string,
        metadata: Record<string, unknown>,
    ): FraudRuleResult {
        return {
            key,
            scoreImpact,
            reason,
            metadata,
        };
    }
    
    private mapScoreToSeverity(score: number): FraudSeverity {
        if (score > 80) return FraudSeverityValues.Critical;
        if (score > 60) return FraudSeverityValues.High;
        if (score > 40) return FraudSeverityValues.Medium;
        if (score > 20) return FraudSeverityValues.Low;
        return FraudSeverityValues.None;
    }

    private mapScoreToStatus(score: number): TransactionStatus {
        if (score > 80) return TransactionStatusValues.Declined;
        if (score > 40) return TransactionStatusValues.Flagged;
        return TransactionStatusValues.Approved;
    }
}
