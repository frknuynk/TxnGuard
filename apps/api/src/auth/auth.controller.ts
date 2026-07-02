import { Body, Controller, Get, Req, Post, UseGuards } from "@nestjs/common";
import { 
    loginRequestSchema,
    logoutRequestSchema,
    refreshRequestSchema,
    registerRequestSchema,
 } from "@txnguard/shared";
import { AuthService } from "./auth.service.js";
import { parseWithZod } from "../common/zod.js";
import type { Request } from "express";
import { JwtAuthGuard } from "./jwt-auth.guard.js";


@Controller("auth")
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @Post("register")
    register(@Body() body: unknown) {
        const input = parseWithZod(registerRequestSchema, body);
        return this.auth.register(input);
    }

    @Post("login")
    login(@Body() body:unknown) {
        const input = parseWithZod(loginRequestSchema, body);
        return this.auth.login(input);
    }

    @Post("refresh")
    refresh(@Body() body:unknown) {
        const input = parseWithZod(refreshRequestSchema, body);
        return this.auth.refresh(input);
    }

    @Post("logout")
    logout(@Body() body:unknown) {
        const input = parseWithZod(logoutRequestSchema, body);
        return this.auth.logout(input);
    }

    @Post("api-key/rotate")
    @UseGuards(JwtAuthGuard)
    rotateApiKey(@Req() request: Request) {
        return this.auth.rotateApiKey(request.currentMerchant!.id);
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    me(@Req() request: Request) {
        return request.currentMerchant;
    }
} 