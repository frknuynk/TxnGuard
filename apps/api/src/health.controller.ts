import { Controller, Get } from "@nestjs/common";
import { fraudSeverities } from "@txnguard/shared";

@Controller("health")
export class HealthController {
    @Get()
    getHealth(){
        return {
            status: "ok",
            service: "api",
            knownFraudSeverities: fraudSeverities,
        };
    }
}