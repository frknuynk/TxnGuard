import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DbModule } from "../db/db.module.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { AnalyticsController } from "./analytics.controller.js";
import { AnalyticsService } from "./analytics.service.js";

@Module({
  imports: [AuthModule, DbModule, MerchantsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
