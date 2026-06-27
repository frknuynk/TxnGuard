import { Body, Controller, Post } from "@nestjs/common";
import { registerRequestSchema } from "@txnguard/shared";
import { AuthService } from "./auth.service.js";


@Controller("auth")
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @Post("register")
    register(@Body() body: unknown) {
        const input = registerRequestSchema.parse(body);
        return this.auth.register(input);
    }
} 