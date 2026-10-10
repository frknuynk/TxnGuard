import { Logger } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Transaction } from "@txnguard/shared";
import type { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service.js";
import { MerchantsService } from "../merchants/merchants.service.js";

@WebSocketGateway({
  namespace: "/transactions",
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly merchants: MerchantsService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = typeof client.handshake.auth.token === "string"
        ? client.handshake.auth.token
        : undefined;
      if (!token) throw new Error("Missing token");
      const payload = await this.auth.verifyAccessToken(token);
      const merchant = await this.merchants.findById(payload.sub);
      if (!merchant?.isActive) throw new Error("Inactive merchant");
      await client.join(this.room(merchant.id));
    } catch {
      client.disconnect(true);
    }
  }

  emitTransaction(transaction: Transaction): void {
    this.server.to(this.room(transaction.merchantId)).emit("new_transaction", transaction);
    if (transaction.status === "flagged") {
      this.server.to(this.room(transaction.merchantId)).emit("transaction_flagged", transaction);
    }
    if (transaction.status === "declined") {
      this.server.to(this.room(transaction.merchantId)).emit("transaction_declined", transaction);
    }
    this.server.to(this.room(transaction.merchantId)).emit("fraud_stats_updated");
    this.logger.debug(`Emitted transaction ${transaction.id}`);
  }

  private room(merchantId: string): string {
    return `merchant:${merchantId}`;
  }
}
