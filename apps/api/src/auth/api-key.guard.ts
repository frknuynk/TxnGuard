import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { MerchantsService } from "../merchants/merchants.service.js";

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly merchants: MerchantsService) {}

    // Runs before the protected route and decides whether the request can continue.
    async canActivate(context: ExecutionContext): Promise<boolean> {    
        const request = context.switchToHttp().getRequest<Request>();
        const apiKey = this.extractApiKey(request);

        const merchant = await this.merchants.findActiveMerchantByApiKey(apiKey);

        if (!merchant) {
            throw new UnauthorizedException("Invalid API key.");
        }

        request.currentMerchant = this.merchants.toPublicMerchant(merchant);

        return true;
    }

    private extractApiKey(request: Request): string {
        const apiKey = request.header("x-api-key");

        if (!apiKey) {
            throw new UnauthorizedException("Missing API key.");
        }

        return apiKey;
    }
}