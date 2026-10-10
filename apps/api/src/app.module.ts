import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { DbModule } from "./db/db.module.js";
import { MerchantsModule } from "./merchants/merchants.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { TransactionsModule } from "./transactions/transactions.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { AnalyticsModule } from "./analytics/analytics.module.js";
import { RealtimeModule } from "./realtime/realtime.module.js";

@Module({
    imports: [DbModule, MerchantsModule, AuthModule, TransactionsModule, RedisModule, AnalyticsModule, RealtimeModule],
    controllers: [HealthController],
})

export class AppModule {}
