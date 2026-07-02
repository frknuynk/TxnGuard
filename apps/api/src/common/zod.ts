import { BadRequestException } from "@nestjs/common";
import { error } from "console";
import { ZodError, type ZodSchema } from "zod";

export function parseWithZod<T>(schema: ZodSchema<T>, value: unknown): T {
    try {
        return schema.parse(value);
    } catch(error) {
        if (error instanceof ZodError) {
            throw new BadRequestException({
                message: "Validation failed",
                issues: error.issues
            });
        }
    }

    throw error;
}