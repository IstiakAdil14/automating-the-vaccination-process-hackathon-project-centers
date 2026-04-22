"use client";

import { useEffect, useState, useCallback } from "react";
import { getTotalPendingCount } from "@/lib/offline/offlineQueue";

export interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline,     setIsOnline]     = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const readPending = useCallback(async () => {
    try {
      setPendingCount(await getTotalPendingCount());
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    readPending();

    const onOnline  = () => { setIsOnline(true);  readPending(); };
    const onOffline = () => { setIsOnline(false); readPending(); };

    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);

    const interval = setInterval(readPending, 5_000);

    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, [readPending]);

  return { isOnline, pendingCount };
}
