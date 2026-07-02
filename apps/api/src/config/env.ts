import { config } from "dotenv"
import { z } from "zod";

config({ path: "../../.env" });

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    API_PORT: z.coerce.number().int().positive().default(3001),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d")
});

export const env = envSchema.parse(process.env);

export type ENV = z.infer<typeof envSchema>;