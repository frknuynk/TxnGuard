import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DbModule } from "../db/db.module.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

@Module({
  imports: [JwtModule.register({}), MerchantsModule, DbModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
