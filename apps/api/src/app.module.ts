import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { DbModule } from "./db/db.module.js";
import { MerchantsModule } from "./merchants/merchants.module.js";
import { AuthModule } from "./auth/auth.module.js";

@Module({
    imports: [DbModule, MerchantsModule, AuthModule],
    controllers: [HealthController],
})

export class AppModule {}