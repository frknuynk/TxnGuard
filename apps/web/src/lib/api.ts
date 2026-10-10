import type { AnalyticsOverview, AuthResponse, CurrentMerchant, GetTransactionResponse, ListTransactionsResponse, RegisterResponse } from "@txnguard/shared";
import { useAuthStore } from "./auth-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const state = useAuthStore.getState();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(state.accessToken ? { authorization: `Bearer ${state.accessToken}` } : {}), ...init.headers },
  });
  if (response.status === 401 && retry && state.refreshToken) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: state.refreshToken }),
    });
    if (refreshed.ok) {
      const session = await refreshed.json() as AuthResponse;
      useAuthStore.getState().setSession(session);
      return request<T>(path, init, false);
    }
    useAuthStore.getState().clear();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    throw new Error(message ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  login: (body: { email: string; password: string }) => request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }, false),
  register: (body: { name: string; email: string; password: string }) => request<RegisterResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }, false),
  logout: (refreshToken: string) => request<{ success: true }>("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }, false),
  overview: (query = "") => request<AnalyticsOverview>(`/analytics/overview${query ? `?${query}` : ""}`),
  transactions: (query = "") => request<ListTransactionsResponse>(`/transactions${query ? `?${query}` : ""}`),
  transaction: (id: string) => request<GetTransactionResponse>(`/transactions/${id}`),
  updateMerchant: (name: string) => request<{ merchant: CurrentMerchant }>("/merchants/me", { method: "PATCH", body: JSON.stringify({ name }) }),
  rotateApiKey: () => request<{ apiKey: string }>("/auth/api-key/rotate", { method: "POST" }),
};
