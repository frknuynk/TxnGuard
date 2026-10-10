import { Module } from "@nestjs/common";
import { RealtimeModule } from "../realtime/realtime.module.js";
import { TransactionEventsQueue } from "./transaction-events.queue.js";

@Module({
  imports: [RealtimeModule],
  providers: [TransactionEventsQueue],
  exports: [TransactionEventsQueue],
})
export class QueueModule {}
