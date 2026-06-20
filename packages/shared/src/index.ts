import { z } from "zod";

export const fraudSeverities = [
    "none",
    "low",
    "medium",
    "high",
    "critical"
] as const;

export type FraudSeverity = (typeof fraudSeverities)[number];

export const transactionStatuses = ["approved", "flagged", "declined"] as const;

export type TransactionStatus = (typeof transactionStatuses)[number];

export const loginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;