export const transactionStatuses = ["approved", "flagged", "declined"] as const;

export type TransactionStatus = (typeof transactionStatuses)[number];