"use client";

import { useEffect, useState, useCallback } from "react";
import { getTotalPendingCount } from "@/lib/offline/offlineQueue";

export function usePendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(await getTotalPendingCount());
    } catch {
      // IDB not available (SSR guard)
    }
  }, []);

  useEffect(() => {
    refresh();

    window.addEventListener("online",  refresh);
    window.addEventListener("offline", refresh);

    // Refresh every 5s so the badge stays accurate during sync
    const interval = setInterval(refresh, 5_000);

    // Also refresh when SW signals sync completed
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "SYNC_NOW" || e.data?.type === "SYNC_COMPLETE") refresh();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("online",  refresh);
      window.removeEventListener("offline", refresh);
      clearInterval(interval);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [refresh]);

  return count;
}
