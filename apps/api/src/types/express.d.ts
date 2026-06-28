import type { CurrentMerchant } from "@txnguard/shared";

declare global {
  namespace Express {
    interface Request {
      currentMerchant?: CurrentMerchant;
    }
  }
}

export {};
