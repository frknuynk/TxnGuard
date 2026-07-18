import { BadRequestException } from "@nestjs/common";
import { ZodError, type ZodTypeAny } from "zod";

export function parseWithZod<TSchema extends ZodTypeAny>(schema: TSchema, value: unknown): TSchema["_output"] {
    try {
        return schema.parse(value);
    } catch(error) {
        if (error instanceof ZodError) {
            throw new BadRequestException({
                message: "Validation failed",
                issues: error.issues
            });
        }
        throw error;
    }
}