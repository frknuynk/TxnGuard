import { Module } from "@nestjs/common";
import { DbModule } from "../db/db.module.js";
import { MerchantsService } from "./merchants.service.js";

@Module({
    imports: [DbModule],
    providers: [MerchantsService],
    exports: [MerchantsService],
})
export class MerchantsModule {}