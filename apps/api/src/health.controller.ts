import { Controller, Get } from "@nestjs/common";
import { fraudSeverities } from "@txnguard/shared";
import { RedisService } from "./redis/redis.service.js";

@Controller("health")
export class HealthController {
    constructor(private readonly redis: RedisService) {}

    @Get()
    async getHealth() {
        const redis = await this.getRedisStatus();

        return {
            status: redis === "PONG" ? "ok" : "degraded",
            service: "api",
            knownFraudSeverities: fraudSeverities,
            dependencies: {
                redis,
            },
        };
    }

    private async getRedisStatus(): Promise<string> {
        try {
            return await this.redis.ping();
        } catch {
            return "unavailable";
        }
    }
}
