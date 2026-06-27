export const fraudSeverities = [
  "none",
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type FraudSeverity = (typeof fraudSeverities)[number];