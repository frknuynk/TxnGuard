import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { createTransactionRequestSchema } from "@txnguard/shared";
import type { Request } from "express";
import { ApiKeyGuard } from "../auth/api-key.guard.js";
import { parseWithZod } from "../common/zod.js";
import { TransactionsService } from "./transactions.service.js";

@Controller("transactions")
export class TransactionsController {
    constructor(private readonly transactions: TransactionsService) {}

    @Post()
    @UseGuards(ApiKeyGuard)
    async create(@Body() body: unknown, @Req() request: Request) {
        const input = parseWithZod(createTransactionRequestSchema, body);

        const transaction = await this.transactions.createTransaction(
            request.currentMerchant!.id,
            input
        );

        return { transaction };
    }
}