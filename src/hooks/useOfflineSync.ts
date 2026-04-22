"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { syncQueue, clearSynced, type SyncProgressEvent } from "@/lib/offline/offlineQueue";
import { OFFLINE_STORE_NAMES, STORE_API_MAP, type PendingStoreName } from "@/lib/constants";

export interface SyncState {
  isSyncing: boolean;
  lastSyncAt: number | null;
  progress: SyncProgressEvent | null;
}

const PENDING_STORES: PendingStoreName[] = [
  OFFLINE_STORE_NAMES.PENDING_VACCINATIONS,
  OFFLINE_STORE_NAMES.PENDING_CHECKINS,
  OFFLINE_STORE_NAMES.PENDING_TOKENS,
];

export function useOfflineSync(): SyncState {
  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSyncAt: null,
    progress: null,
  });
  const syncingRef = useRef(false);

  const runSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setState((s) => ({ ...s, isSyncing: true, progress: null }));

    let totalSynced = 0;
    let totalConflicts = 0;
    let totalFailed = 0;

    try {
      for (const store of PENDING_STORES) {
        if (!navigator.onLine) break;

        const apiPath = STORE_API_MAP[store];
        const result = await syncQueue(store, apiPath, (progress) => {
          setState((s) => ({ ...s, progress }));
        });

        totalSynced    += result.synced;
        totalConflicts += result.conflicts;
        totalFailed    += result.failed;

        // Clean up old failed/conflict records
        await clearSynced(store);
      }

      if (totalSynced > 0) {
        toast.success(
          `${totalSynced} offline record${totalSynced !== 1 ? "s" : ""} synced successfully`,
          { duration: 4000 }
        );
      }
      if (totalConflicts > 0) {
        toast.warning(
          `${totalConflicts} conflict${totalConflicts !== 1 ? "s" : ""} detected — review in Security & Audit`,
          { duration: 6000 }
        );
      }
      if (totalFailed > 0) {
        toast.error(
          `${totalFailed} record${totalFailed !== 1 ? "s" : ""} failed to sync — check audit log`,
          { duration: 6000 }
        );
      }
    } finally {
      syncingRef.current = false;
      setState({ isSyncing: false, lastSyncAt: Date.now(), progress: null });
    }
  }, []);

  useEffect(() => {
    // Attempt sync on mount (handles page reload after reconnect)
    if (navigator.onLine) runSync();

    const onOnline  = () => runSync();
    const onOffline = () => {
      syncingRef.current = false;
      setState((s) => ({ ...s, isSyncing: false }));
    };

    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);

    // Listen for SW "SYNC_NOW" messages (from periodic background sync)
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "SYNC_NOW") runSync();
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    // Periodic retry every 30s while online (catches partial failures)
    const interval = setInterval(() => {
      if (navigator.onLine) runSync();
    }, 30_000);

    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      clearInterval(interval);
    };
  }, [runSync]);

  return state;
}
