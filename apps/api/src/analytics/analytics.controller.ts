import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { analyticsOverviewQuerySchema } from "@txnguard/shared";
import { parseWithZod } from "../common/zod.js";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { AnalyticsService } from "./analytics.service.js";

@Controller("analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("overview")
  overview(@Query() query: unknown, @Req() request: Request) {
    return this.analytics.getOverview(request.currentMerchant!.id, parseWithZod(analyticsOverviewQuerySchema, query));
  }
}
