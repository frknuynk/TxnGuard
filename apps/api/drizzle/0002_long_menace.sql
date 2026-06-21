CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"card_bin" varchar(8) NOT NULL,
	"card_country" varchar(2) NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"ip_country" varchar(2) NOT NULL,
	"fraud_score" integer DEFAULT 0 NOT NULL,
	"fraud_severity" varchar(20) DEFAULT 'none' NOT NULL,
	"fraud_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fraud_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_merchant_id_idx" ON "transactions" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "transactions_created_at_idx" ON "transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transactions_status_idx" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "transactions_fraud_score_idx" ON "transactions" USING btree ("fraud_score");--> statement-breakpoint
CREATE INDEX "transactions_fraud_severity_idx" ON "transactions" USING btree ("fraud_severity");--> statement-breakpoint
CREATE INDEX "transactions_merchant_id_created_at_idx" ON "transactions" USING btree ("merchant_id","created_at");