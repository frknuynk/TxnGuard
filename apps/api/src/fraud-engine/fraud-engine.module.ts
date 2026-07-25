import { Module } from "@nestjs/common";
import { FraudEngineService } from "./fraud-engine.service.js";

@Module({
  providers: [FraudEngineService],
  exports: [FraudEngineService],
})

export class FraudEngineModule {}