import { Body, Controller, Get, NotFoundException, Patch, Req, UseGuards } from "@nestjs/common";
import { updateMerchantRequestSchema } from "@txnguard/shared";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { parseWithZod } from "../common/zod.js";
import { MerchantsService } from "./merchants.service.js";

@Controller("merchants/me")
@UseGuards(JwtAuthGuard)
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Get()
  getCurrent(@Req() request: Request) {
    return { merchant: request.currentMerchant! };
  }

  @Patch()
  async update(@Body() body: unknown, @Req() request: Request) {
    const input = parseWithZod(updateMerchantRequestSchema, body);
    const merchant = await this.merchants.updateProfile(request.currentMerchant!.id, input.name);
    if (!merchant) throw new NotFoundException("Merchant not found.");
    return { merchant };
  }
}
