import { z } from "zod";
import { currentMerchantSchema } from "./merchants.js";

export const loginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const authResponseSchema = z.object({
    merchant: currentMerchantSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const registerResponseSchema = authResponseSchema.extend({
    apiKey: z.string(),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;