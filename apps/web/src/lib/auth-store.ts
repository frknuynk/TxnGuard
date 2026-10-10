"use client";

import type { CurrentMerchant } from "@txnguard/shared";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type AuthState = {
  merchant: CurrentMerchant | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: { merchant: CurrentMerchant; accessToken: string; refreshToken: string }) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    merchant: null,
    accessToken: null,
    refreshToken: null,
    setSession: (session) => set(session),
    clear: () => set({ merchant: null, accessToken: null, refreshToken: null }),
  }),
  { name: "txnguard-session", storage: createJSONStorage(() => sessionStorage) },
));
