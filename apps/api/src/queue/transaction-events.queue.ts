import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Transaction } from "@txnguard/shared";
import { Queue, Worker } from "bullmq";
import { env } from "../config/env.js";
import { RealtimeGateway } from "../realtime/realtime.gateway.js";

const queueName = "transaction-events";

@Injectable()
export class TransactionEventsQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransactionEventsQueue.name);
  private readonly connection = this.connectionOptions();
  private readonly queue = new Queue<Transaction>(queueName, { connection: this.connection });
  private worker?: Worker<Transaction>;

  constructor(private readonly realtime: RealtimeGateway) {}

  onModuleInit(): void {
    this.worker = new Worker<Transaction>(queueName, async (job) => {
      this.realtime.emitTransaction(job.data);
    }, { connection: this.connection, concurrency: 10 });
    this.worker.on("failed", (job, error) => {
      this.logger.error(`Realtime job ${job?.id ?? "unknown"} failed: ${error.message}`);
    });
  }

  async publish(transaction: Transaction): Promise<void> {
    await this.queue.add("transaction.processed", transaction, {
      jobId: transaction.id,
      attempts: 3,
      backoff: { type: "exponential", delay: 500 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.worker?.close(), this.queue.close()]);
  }

  private connectionOptions() {
    const url = new URL(env.REDIS_URL);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      tls: url.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  }
}
