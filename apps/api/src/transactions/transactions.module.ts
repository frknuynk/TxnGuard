import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DbModule } from "../db/db.module.js";
import { FraudEngineModule } from "../fraud-engine/fraud-engine.module.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { TransactionsController } from "./transactions.controller.js";
import { TransactionsService } from "./transactions.service.js";

@Module({
    imports: [DbModule, MerchantsModule, AuthModule, FraudEngineModule],
    controllers: [TransactionsController],
    providers: [TransactionsService]
})
export class TransactionsModule {}
