import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    apiKeyHash: varchar("api_key_hash", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("merchants_api_key_hash_idx").on(table.apiKeyHash),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("refresh_tokens_merchant_id_idx").on(table.merchantId),
    index("refresh_tokens_token_hash_idx").on(table.tokenHash),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),

    amountMinor: integer("amount_minor").notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),

    cardBin: varchar("card_bin", { length: 8 }).notNull(),
    cardCountry: varchar("card_country", { length: 2 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    ipCountry: varchar("ip_country", { length: 2 }).notNull(),

    fraudScore: integer("fraud_score").notNull().default(0),
    fraudSeverity: varchar("fraud_severity", { length: 20 }).notNull().default("none"),
    fraudReasons: jsonb("fraud_reasons").notNull().default([]),
    fraudMetadata: jsonb("fraud_metadata").notNull().default({}),
    status: varchar("status", { length: 20 }).notNull().default("approved"),
    idempotencyKey: varchar("idempotency_key", { length: 120 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transactions_merchant_id_idx").on(table.merchantId),
    index("transactions_created_at_idx").on(table.createdAt),
    index("transactions_status_idx").on(table.status),
    index("transactions_fraud_score_idx").on(table.fraudScore),
    index("transactions_fraud_severity_idx").on(table.fraudSeverity),
    index("transactions_merchant_id_created_at_idx").on(
      table.merchantId,
      table.createdAt,
    ),
    uniqueIndex("transactions_merchant_id_idempotency_key_idx").on(
      table.merchantId,
      table.idempotencyKey,
    ),
  ],
);

export const fraudEvents = pgTable(
  "fraud_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    ruleKey: varchar("rule_key", { length: 80 }).notNull(),
    scoreImpact: integer("score_impact").notNull(),
    reason: varchar("reason", { length: 255 }).notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("fraud_events_transaction_id_idx").on(table.transactionId),
    index("fraud_events_rule_key_idx").on(table.ruleKey),
  ],
);
