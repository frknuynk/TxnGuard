import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";
import {
    createTransactionRequestSchema,
    listTransactionsQuerySchema,
} from "@txnguard/shared";
import type { Request } from "express";
import { ApiKeyGuard } from "../auth/api-key.guard.js";
import { parseWithZod } from "../common/zod.js";
import { TransactionsService } from "./transactions.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";

@Controller("transactions")
export class TransactionsController {
    constructor(private readonly transactions: TransactionsService) {}

    @Post()
    @UseGuards(ApiKeyGuard)
    async create(@Body() body: unknown, @Req() request: Request) {
        const input = parseWithZod(createTransactionRequestSchema, body);

        const transaction = await this.transactions.createTransaction(
            request.currentMerchant!.id,
            input,
        );

        return { transaction };
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    list(@Query() query: unknown, @Req() request: Request) {
        const input = parseWithZod(listTransactionsQuerySchema, query);

        return this.transactions.listTransactions(
            request.currentMerchant!.id,
            input,
        );
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    async findById(@Param("id") id: string, @Req() request: Request) {
        const result = await this.transactions.findTransactionById(
            request.currentMerchant!.id,
            id,
        );

        if (!result) {
            throw new NotFoundException("Transaction not found.");
        }

        return result;
    }
}
