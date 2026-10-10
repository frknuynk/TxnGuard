export const FraudRuleKeys = {
    CountryMismatch: "country_mismatch",
    HighAmount: "high_amount",
    MerchantVelocity: "merchant_velocity_1m",
    NightTimeHighValue: "night_time_high_value",
} as const;

export type FraudRuleKey = (typeof FraudRuleKeys)[keyof typeof FraudRuleKeys];

export const FraudRules = {
    CountryMismatch: {
        key: FraudRuleKeys.CountryMismatch,
        scoreImpact: 25,
        reason: "Card country does not match IP country.",
    },
    HighAmount: {
        key: FraudRuleKeys.HighAmount,
        scoreImpact: 30,
        reason: "Transaction amount is high.",
        thresholdMinor: 100000,
    },
    MerchantVelocity: {
        key: FraudRuleKeys.MerchantVelocity,
        scoreImpact: 35,
        reason: "Merchant transaction velocity exceeded the configured window.",
    },
    NightTimeHighValue: {
        key: FraudRuleKeys.NightTimeHighValue,
        scoreImpact: 10,
        reason: "A high-value transaction was submitted during overnight hours.",
        thresholdMinor: 50000,
        startHourUtc: 0,
        endHourUtc: 5,
    },
} as const;
