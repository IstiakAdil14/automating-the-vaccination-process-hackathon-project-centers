"use client";

// SyncWorker — mounts once in the worker layout, drives background sync.
// All sync logic lives in useOfflineSync; this component just activates it.

import { useOfflineSync } from "@/hooks/useOfflineSync";

export function SyncWorker() {
  // Mounting this hook is sufficient — it registers all event listeners
  // and triggers sync on mount + every online event + every 30s.
  useOfflineSync();
  return null;
}
