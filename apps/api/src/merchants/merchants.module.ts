import { forwardRef, Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { MerchantsService } from "./merchants.service.js";
import { MerchantsController } from "./merchants.controller.js";
import { AuthModule } from "../auth/auth.module.js";

@Module({
    imports: [DbModule, forwardRef(() => AuthModule)],
    controllers: [MerchantsController],
    providers: [MerchantsService],
    exports: [MerchantsService],
})
export class MerchantsModule {}
