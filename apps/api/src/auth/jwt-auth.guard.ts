import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service.js";
import { MerchantsService } from "../merchants/merchants.service.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor (
        private readonly auth: AuthService,
        private readonly merchants: MerchantsService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const accessToken = this.extractBearerToken(request);

        const payload = await this.auth.verifyAccessToken(accessToken);
        const merchant = await this.merchants.findById(payload.sub);

        if(!merchant || !merchant.isActive) {
            throw new UnauthorizedException("Invalid access token.");
        }

        request.currentMerchant = this.merchants.toPublicMerchant(merchant);

        return true;
    }

    private extractBearerToken(request: Request): string {
        const authorization = request.headers.authorization;

        if (!authorization) {
            throw new UnauthorizedException("Missing access token.");
        }

        const [type, token] = authorization.split(" ");

        if (type !== "Bearer" || !token) {
            throw new UnauthorizedException("Invalid authorization header.");
        }

        return token;
    }
}
