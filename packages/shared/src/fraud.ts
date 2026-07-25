export const fraudSeverities = [
  "none",
  "low",
  "medium",
  "high",
  "critical",
] as const;

export type FraudSeverity = (typeof fraudSeverities)[number];

export const FraudSeverityValues = {
  None: "none",
  Low: "low",
  Medium: "medium",
  High: "high",
  Critical: "critical",
} as const satisfies Record<string, FraudSeverity>;
