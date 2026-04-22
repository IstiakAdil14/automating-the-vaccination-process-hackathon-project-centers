// lib/offline/offlineQueue.ts
// Core offline queue utilities.
// Rules:
//   - addToQueue: always uses crypto.randomUUID() — no collision risk on sync
//   - syncQueue: processes records in timestamp order (FIFO), exponential backoff
//   - 409 Conflict: record is kept with status="conflict" + server version stored
//   - 4xx (not 409): unrecoverable — mark "failed", do not retry
//   - 5xx / network error: leave as "pending", retry next time (up to MAX_SYNC_RETRIES)

import { getDB, type PendingRecord } from "./db";
import { MAX_SYNC_RETRIES, type PendingStoreName } from "@/lib/constants";

// ── Sync progress event ───────────────────────────────────────────────────────

export interface SyncProgressEvent {
  store: PendingStoreName;
  total: number;
  synced: number;
  failed: number;
  conflicts: number;
  done: boolean;
}

type ProgressCallback = (e: SyncProgressEvent) => void;

// ── Add to queue ──────────────────────────────────────────────────────────────

export async function addToQueue(
  store: PendingStoreName,
  payload: Record<string, unknown>
): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const offlineTimestamp = new Date().toISOString();
  const record: PendingRecord = {
    id,
    // Embed offlineTimestamp in payload so the sync API route can pass it
    // to AuditLogger.log() as occurredAt — audit trail shows when the action
    // actually occurred offline, not when it was synced.
    payload: { ...payload, offlineTimestamp },
    timestamp: Date.now(),
    retryCount: 0,
    status: "pending",
  };
  await db.add(store, record);
  return id;
}

// ── Get all pending records (status = "pending") ──────────────────────────────

export async function getPending(store: PendingStoreName): Promise<PendingRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex(store, "status", "pending");
  // Sort by timestamp ascending — FIFO
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

// ── Get total unsynced count across all pending stores ────────────────────────

export async function getTotalPendingCount(): Promise<number> {
  const db = await getDB();
  const stores: PendingStoreName[] = [
    "pending_vaccinations",
    "pending_checkins",
    "pending_tokens",
  ];
  let total = 0;
  for (const store of stores) {
    const count = await db.countFromIndex(store, "status", "pending");
    total += count;
  }
  return total;
}

// ── Exponential backoff delay ─────────────────────────────────────────────────

function backoffMs(retryCount: number): number {
  // 1s, 2s, 4s, 8s, 16s — capped at 30s
  return Math.min(1000 * Math.pow(2, retryCount), 30_000);
}

// ── Sync a single store ───────────────────────────────────────────────────────

export async function syncQueue(
  store: PendingStoreName,
  apiPath: string,
  onProgress?: ProgressCallback
): Promise<SyncProgressEvent> {
  const db = await getDB();
  const pending = await getPending(store);

  const result: SyncProgressEvent = {
    store,
    total: pending.length,
    synced: 0,
    failed: 0,
    conflicts: 0,
    done: false,
  };

  if (pending.length === 0) {
    result.done = true;
    onProgress?.(result);
    return result;
  }

  for (const record of pending) {
    if (!navigator.onLine) break; // abort mid-batch if we go offline

    // Skip if exceeded max retries
    if (record.retryCount >= MAX_SYNC_RETRIES) {
      await db.put(store, { ...record, status: "failed", lastError: "Max retries exceeded" });
      result.failed++;
      onProgress?.(result);
      continue;
    }

    // Mark as syncing
    await db.put(store, { ...record, status: "syncing" });

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record.payload),
      });

      if (res.ok) {
        // Success — remove from queue
        await db.delete(store, record.id);
        result.synced++;
        onProgress?.(result);
        continue;
      }

      const body = await res.json().catch(() => ({}));

      if (res.status === 409) {
        // Conflict — keep record with server version for manual resolution
        await db.put(store, {
          ...record,
          status: "conflict",
          retryCount: record.retryCount + 1,
          lastError: body.error ?? "Conflict",
          conflictServerVersion: body.serverVersion ?? body,
        });
        result.conflicts++;
        onProgress?.(result);
        continue;
      }

      if (res.status >= 400 && res.status < 500) {
        // Unrecoverable client error — mark failed, stop retrying
        await db.put(store, {
          ...record,
          status: "failed",
          retryCount: record.retryCount + 1,
          lastError: body.error ?? `HTTP ${res.status}`,
        });
        result.failed++;
        onProgress?.(result);
        continue;
      }

      // 5xx — put back as pending, increment retry, apply backoff
      await db.put(store, {
        ...record,
        status: "pending",
        retryCount: record.retryCount + 1,
        lastError: `HTTP ${res.status}`,
      });
      // Wait before next attempt
      await new Promise((r) => setTimeout(r, backoffMs(record.retryCount)));

    } catch (err) {
      // Network error — put back as pending
      await db.put(store, {
        ...record,
        status: "pending",
        retryCount: record.retryCount + 1,
        lastError: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  result.done = true;
  onProgress?.(result);
  return result;
}

// ── Clear synced / failed records older than 24h ──────────────────────────────

export async function clearSynced(store: PendingStoreName): Promise<number> {
  const db = await getDB();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const all = await db.getAll(store);
  let cleared = 0;
  for (const r of all) {
    if ((r.status === "failed" || r.status === "conflict") && r.timestamp < cutoff) {
      await db.delete(store, r.id);
      cleared++;
    }
  }
  return cleared;
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

export async function cacheData(
  store: "cached_appointments" | "cached_inventory" | "cached_slots",
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = await getDB();
  await db.put(store, { id, data, cachedAt: Date.now() });
}

export async function getCached(
  store: "cached_appointments" | "cached_inventory" | "cached_slots",
  id: string
): Promise<Record<string, unknown> | null> {
  const db = await getDB();
  const record = await db.get(store, id);
  return record?.data ?? null;
}

export async function getAllCached(
  store: "cached_appointments" | "cached_inventory" | "cached_slots"
): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  const all = await db.getAll(store);
  return all.map((r) => r.data);
}
