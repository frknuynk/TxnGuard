import { Body, Controller, Get, Req, Post, UseGuards } from "@nestjs/common";
import { 
    loginRequestSchema,
    logoutRequestSchema,
    refreshRequestSchema,
    registerRequestSchema,
 } from "@txnguard/shared";
import { AuthService } from "./auth.service.js";
import type { Request } from "express";
import { JwtAuthGuard } from "./jwt-auth.guard.js";


@Controller("auth")
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @Post("register")
    register(@Body() body: unknown) {
        const input = registerRequestSchema.parse(body);
        return this.auth.register(input);
    }

    @Post("login")
    login(@Body() body:unknown) {
        const input = loginRequestSchema.parse(body);
        return this.auth.login(input);
    }

    @Post("refresh")
    refresh(@Body() body:unknown) {
        const input = refreshRequestSchema.parse(body);
        return this.auth.refresh(input);
    }

    @Post("logout")
    logout(@Body() body:unknown) {
        const input = logoutRequestSchema.parse(body);
        return this.auth.logout(input);
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    me(@Req() request: Request) {
        return request.currentMerchant;
    }
} 