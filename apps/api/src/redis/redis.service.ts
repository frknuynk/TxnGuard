import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from "@nestjs/common";
import { createClient } from "redis";
import { env } from "../config/env.js";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private readonly client = createClient({
        url: env.REDIS_URL,
        socket: {
            connectTimeout: 1000,
            reconnectStrategy: false,
        },
    });
    private connectPromise: Promise<void> | null = null;

    constructor() {
        this.client.on("error", (error) => {
            this.logger.warn(`Redis client error: ${this.formatError(error)}`);
        });
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.connect();
        } catch {
            this.logger.warn("Redis is unavailable during startup.");
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.client.isOpen) {
            await this.client.quit();
        }
    }

    async ping(): Promise<string> {
        await this.connect();
        return this.client.ping();
    }

    async incrementWithTtl(key: string, ttlSeconds: number): Promise<number> {
        const result = await this.consumeFixedWindow(key, ttlSeconds);
        return result.count;
    }

    async consumeFixedWindow(key: string, ttlSeconds: number): Promise<{ count: number; retryAfterSeconds: number }> {
        await this.connect();

        const result = await this.client.eval(
            "local count = redis.call('INCR', KEYS[1]); if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return count",
            { keys: [key], arguments: [String(ttlSeconds)] },
        );

        const retryAfterSeconds = await this.client.ttl(key);
        return { count: Number(result), retryAfterSeconds: Math.max(0, retryAfterSeconds) };
    }

    private async connect(): Promise<void> {
        if (this.client.isReady) {
            return;
        }

        if (!this.connectPromise) {
            this.connectPromise = this.client
                .connect()
                .then(() => {
                    this.logger.log("Redis connection established.");
                })
                .finally(() => {
                    this.connectPromise = null;
                });
        }

        await this.connectPromise;
    }

    private formatError(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        return String(error);
    }
}
