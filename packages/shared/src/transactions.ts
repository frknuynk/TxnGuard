import { z } from "zod";
import { fraudSeverities } from "./fraud.js";

export const transactionStatuses = ["approved", "flagged", "declined"] as const;

export type TransactionStatus = (typeof transactionStatuses)[number];

export const TransactionStatusValues = {
    Approved: "approved",
    Flagged: "flagged",
    Declined: "declined",
} as const satisfies Record<string, TransactionStatus>;

export const createTransactionRequestSchema = z.object({
    amountMinor: z.number().int().positive(),
    currency: z.string().length(3),
    cardBin: z.string().regex(/^\d{6,8}$/),
    cardCountry: z.string().length(2),
    ipAddress: z.string().min(1).max(45),
    ipCountry: z.string().length(2),
});

export type CreateTransactionRequest = z.infer<typeof createTransactionRequestSchema>;

export const transactionSchema = z.object({
    id: z.string().uuid(),
    merchantId: z.string().uuid(),
    amountMinor: z.number().int(),
    currency: z.string().length(3),
    cardBin: z.string(),
    cardCountry: z.string().length(2),
    ipAddress: z.string(),
    ipCountry: z.string().length(2),
    fraudScore: z.number().int().min(0).max(100),
    fraudSeverity: z.enum(fraudSeverities),
    fraudReasons: z.array(z.string()),
    fraudMetadata: z.record(z.unknown()),
    status: z.enum(transactionStatuses),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const createTransactionResponseSchema = z.object({
    transaction: transactionSchema,
});

export type Transaction = z.infer<typeof transactionSchema>;

export type CreateTransactionResponse = z.infer<typeof createTransactionResponseSchema>;

export const listTransactionsQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export type ListTransactionsQuery = z.output<typeof listTransactionsQuerySchema>;

export const listTransactionsResponseSchema = z.object({
    transactions: z.array(transactionSchema),
    pagination: z.object({
        limit: z.number().int(),
        offset: z.number().int(),
        count: z.number().int(),
    }),
});

export type ListTransactionsResponse = z.infer<
  typeof listTransactionsResponseSchema
>;

export const getTransactionResponseSchema = z.object({ transaction: transactionSchema });

export type GetTransactionResponse = z.infer<typeof getTransactionResponseSchema>;
