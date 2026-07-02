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