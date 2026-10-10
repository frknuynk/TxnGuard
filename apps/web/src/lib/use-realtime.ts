"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { useState } from "react";
import type { Transaction } from "@txnguard/shared";
import { useAuthStore } from "./auth-store";

export function useRealtime() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  useEffect(() => {
    if (!token) { setConnected(false); return; }
    const url = `${process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001"}/transactions`;
    const socket = io(url, { auth: { token }, transports: ["websocket"] });
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
    };
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("new_transaction", (transaction: Transaction) => { setLastTransaction(transaction); refresh(); });
    socket.on("fraud_stats_updated", refresh);
    return () => { socket.disconnect(); setConnected(false); };
  }, [queryClient, token]);
  return { connected, lastTransaction };
}
