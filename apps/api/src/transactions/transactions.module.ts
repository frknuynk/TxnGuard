import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { TransactionsController } from "./transactions.controller.js";
import { TransactionsService } from "./transactions.service.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
    imports: [DbModule, MerchantsModule, AuthModule],
    controllers: [TransactionsController],
    providers: [TransactionsService]
})
export class TransactionsModule {}