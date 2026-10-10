import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { MerchantsModule } from "../merchants/merchants.module.js";
import { RealtimeGateway } from "./realtime.gateway.js";

@Module({
  imports: [AuthModule, MerchantsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
