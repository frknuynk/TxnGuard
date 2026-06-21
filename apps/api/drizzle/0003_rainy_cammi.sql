CREATE TABLE "fraud_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"rule_key" varchar(80) NOT NULL,
	"score_impact" integer NOT NULL,
	"reason" varchar(255) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fraud_events" ADD CONSTRAINT "fraud_events_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fraud_events_transaction_id_idx" ON "fraud_events" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "fraud_events_rule_key_idx" ON "fraud_events" USING btree ("rule_key");