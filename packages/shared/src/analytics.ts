import { z } from "zod";
import { fraudSeverities } from "./fraud.js";
import { transactionStatuses } from "./transactions.js";

export const analyticsOverviewSchema = z.object({
  range: z.enum(["24h", "7d", "30d", "custom"]),
  bucket: z.enum(["hour", "day"]),
  totalTransactions: z.number().int(),
  totalVolumeMinor: z.number().int(),
  averageFraudScore: z.number(),
  approvalRate: z.number(),
  statusCounts: z.record(z.enum(transactionStatuses), z.number().int()),
  severityCounts: z.record(z.enum(fraudSeverities), z.number().int()),
  hourlyVolume: z.array(z.object({
    hour: z.string(),
    count: z.number().int(),
    volumeMinor: z.number().int(),
  })),
});

export const analyticsOverviewQuerySchema = z.object({
  range: z.enum(["24h", "7d", "30d", "custom"]).default("24h"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).superRefine((value, context) => {
  if (value.range === "custom" && (!value.from || !value.to)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Custom range requires from and to dates." });
  if (value.from && value.to && value.from > value.to) context.addIssue({ code: z.ZodIssueCode.custom, message: "from must be before to." });
});

export type AnalyticsOverviewQuery = z.output<typeof analyticsOverviewQuerySchema>;

export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
