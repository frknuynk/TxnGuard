import { Injectable } from "@nestjs/common";
import type { AnalyticsOverview, AnalyticsOverviewQuery, FraudSeverity, TransactionStatus } from "@txnguard/shared";
import { and, eq, gte, sql } from "drizzle-orm";
import { DbService } from "../db/db.service.js";
import { transactions } from "../db/schema.js";

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DbService) {}

  async getOverview(merchantId: string, query: AnalyticsOverviewQuery): Promise<AnalyticsOverview> {
    const now = new Date();
    const since = query.range === "24h" ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : query.range === "7d" ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : query.range === "30d" ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : query.from!;
    const until = query.range === "custom" ? query.to! : now;
    const bucket = query.range === "24h" ? "hour" : "day";
    const scope = and(
      eq(transactions.merchantId, merchantId),
      gte(transactions.createdAt, since),
      sql`${transactions.createdAt} <= ${until}`,
    );
    const [summary, statuses, severities, hours] = await Promise.all([
      this.db.client.select({
        count: sql<number>`count(*)::int`,
        volume: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)::bigint`,
        averageScore: sql<number>`coalesce(avg(${transactions.fraudScore}), 0)::float`,
      }).from(transactions).where(scope),
      this.db.client.select({ key: transactions.status, count: sql<number>`count(*)::int` })
        .from(transactions).where(scope).groupBy(transactions.status),
      this.db.client.select({ key: transactions.fraudSeverity, count: sql<number>`count(*)::int` })
        .from(transactions).where(scope).groupBy(transactions.fraudSeverity),
      this.db.client.select({
        hour: bucket === "hour" ? sql<string>`to_char(date_trunc('hour', ${transactions.createdAt}), 'YYYY-MM-DD"T"HH24:00:00"Z"')` : sql<string>`to_char(date_trunc('day', ${transactions.createdAt}), 'YYYY-MM-DD"T"00:00:00"Z"')`,
        count: sql<number>`count(*)::int`,
        volumeMinor: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)::bigint`,
      }).from(transactions).where(scope)
        .groupBy(bucket === "hour" ? sql`date_trunc('hour', ${transactions.createdAt})` : sql`date_trunc('day', ${transactions.createdAt})`)
        .orderBy(bucket === "hour" ? sql`date_trunc('hour', ${transactions.createdAt})` : sql`date_trunc('day', ${transactions.createdAt})`),
    ]);

    const statusCounts: Record<TransactionStatus, number> = { approved: 0, flagged: 0, declined: 0 };
    const severityCounts: Record<FraudSeverity, number> = { none: 0, low: 0, medium: 0, high: 0, critical: 0 };
    for (const row of statuses) statusCounts[row.key as TransactionStatus] = row.count;
    for (const row of severities) severityCounts[row.key as FraudSeverity] = row.count;
    const total = summary[0]?.count ?? 0;

    return {
      range: query.range,
      bucket,
      totalTransactions: total,
      totalVolumeMinor: Number(summary[0]?.volume ?? 0),
      averageFraudScore: Number((summary[0]?.averageScore ?? 0).toFixed(1)),
      approvalRate: total === 0 ? 0 : Number(((statusCounts.approved / total) * 100).toFixed(1)),
      statusCounts,
      severityCounts,
      hourlyVolume: hours.map((row) => ({ ...row, volumeMinor: Number(row.volumeMinor) })),
    };
  }
}
