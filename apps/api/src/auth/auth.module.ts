import { forwardRef, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DbModule } from "../db/db.module.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { RedisModule } from "../redis/redis.module.js";

@Module({
  imports: [JwtModule.register({}), forwardRef(() => MerchantsModule), DbModule, RedisModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
