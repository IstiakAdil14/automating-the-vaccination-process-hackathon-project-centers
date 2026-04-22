// lib/idb.ts
// Backward-compatibility shim — delegates to lib/offline/offlineQueue.
// Existing callers (useRecordVaccination, SyncWorker) continue to work unchanged.

import {
  addToQueue,
  getPending,
  type PendingRecord,
} from "@/lib/offline/offlineQueue";
import { getDB } from "@/lib/offline/db";
import { OFFLINE_STORE_NAMES } from "@/lib/constants";

export async function saveOfflineVaccination(
  payload: Record<string, unknown>
): Promise<void> {
  await addToQueue(OFFLINE_STORE_NAMES.PENDING_VACCINATIONS, payload);
}

export async function getPendingVaccinations(): Promise<PendingRecord[]> {
  return getPending(OFFLINE_STORE_NAMES.PENDING_VACCINATIONS);
}

export async function deleteOfflineVaccination(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(OFFLINE_STORE_NAMES.PENDING_VACCINATIONS, id);
}

// Re-export for any direct imports
export { addToQueue, getPending } from "@/lib/offline/offlineQueue";
