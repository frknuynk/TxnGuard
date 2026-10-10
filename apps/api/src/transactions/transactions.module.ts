import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DbModule } from "../db/db.module.js";
import { FraudEngineModule } from "../fraud-engine/fraud-engine.module.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { TransactionsController } from "./transactions.controller.js";
import { TransactionsService } from "./transactions.service.js";
import { RedisModule } from "../redis/redis.module.js";
import { QueueModule } from "../queue/queue.module.js";

@Module({
    imports: [DbModule, MerchantsModule, AuthModule, FraudEngineModule, RedisModule, QueueModule],
    controllers: [TransactionsController],
    providers: [TransactionsService],
    exports: [TransactionsService],
})
export class TransactionsModule {}
