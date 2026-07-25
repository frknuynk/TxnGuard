export const FraudRuleKeys = {
    CountryMismatch: "country_mismatch",
    HighAmount: "high_amount",
} as const;

export type FraudRuleKey = (typeof FraudRuleKeys)[keyof typeof FraudRuleKeys];

export const FraudRules = {
    CountryMismatch: {
        key: FraudRuleKeys.CountryMismatch,
        scoreImpact: 30,
        reason: "Card country does not match IP country.",
    },
    HighAmount: {
        key: FraudRuleKeys.HighAmount,
        scoreImpact: 25,
        reason: "Transaction amount is high.",
        thresholdMinor: 100000,
    },
} as const;
