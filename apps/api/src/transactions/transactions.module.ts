import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { TransactionsController } from "./transactions.controller.js";
import { TransactionsService } from "./transactions.service.js";

@Module({
    imports: [DbModule, MerchantsModule],
    controllers: [TransactionsController],
    providers: [TransactionsService]
})
export class TransactionsModule {}