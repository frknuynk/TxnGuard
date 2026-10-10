import { config } from "dotenv"
import { z } from "zod";

config({ path: "../../.env" });

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    API_PORT: z.coerce.number().int().positive().default(3001),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    VELOCITY_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
    VELOCITY_THRESHOLD: z.coerce.number().int().positive().default(5),
    API_KEY_ROTATION_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),
    API_KEY_ROTATION_LIMIT: z.coerce.number().int().positive().default(3),
});

export const env = envSchema.parse(process.env);

export type ENV = z.infer<typeof envSchema>;
