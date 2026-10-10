import { z } from "zod";

export const currentMerchantSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type CurrentMerchant = z.infer<typeof currentMerchantSchema>;

export const updateMerchantRequestSchema = z.object({
    name: z.string().min(2).max(120),
});

export type UpdateMerchantRequest = z.infer<typeof updateMerchantRequestSchema>;
