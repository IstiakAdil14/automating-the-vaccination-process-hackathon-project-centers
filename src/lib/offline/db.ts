// lib/offline/db.ts
// IndexedDB schema for the offline-first Centers portal.
// Uses the `idb` library for a Promise-based API.
// DB version 2 — migrates from the old raw-IDB version 1 schema.

import { openDB as idbOpen, type IDBPDatabase } from "idb";
import {
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  OFFLINE_STORE_NAMES,
} from "@/lib/constants";

// ── Record shapes ─────────────────────────────────────────────────────────────

export interface PendingRecord {
  id: string;                        // crypto.randomUUID() — stable across retries
  payload: Record<string, unknown>;  // the full API request body
  timestamp: number;                 // Date.now() when created
  retryCount: number;                // incremented on each failed attempt
  status: "pending" | "syncing" | "failed" | "conflict";
  lastError?: string;
  conflictServerVersion?: Record<string, unknown>; // populated on 409
}

export interface CachedRecord {
  id: string;
  data: Record<string, unknown>;
  cachedAt: number;
}

// ── DB type map ───────────────────────────────────────────────────────────────

export interface VcbdDB {
  [OFFLINE_STORE_NAMES.PENDING_VACCINATIONS]: PendingRecord;
  [OFFLINE_STORE_NAMES.PENDING_CHECKINS]:     PendingRecord;
  [OFFLINE_STORE_NAMES.PENDING_TOKENS]:       PendingRecord;
  [OFFLINE_STORE_NAMES.CACHED_APPOINTMENTS]:  CachedRecord;
  [OFFLINE_STORE_NAMES.CACHED_INVENTORY]:     CachedRecord;
  [OFFLINE_STORE_NAMES.CACHED_SLOTS]:         CachedRecord;
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _db: IDBPDatabase<VcbdDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<VcbdDB>> {
  if (_db) return _db;

  _db = await idbOpen<VcbdDB>(OFFLINE_DB_NAME, OFFLINE_DB_VERSION, {
    upgrade(db, oldVersion) {
      // ── v1 → v2: drop old raw store, create typed stores ─────────────────
      if (oldVersion < 2) {
        // Remove legacy store from v1 if it exists
        if (db.objectStoreNames.contains("pending_vaccinations" as never)) {
          db.deleteObjectStore("pending_vaccinations" as never);
        }
        if (db.objectStoreNames.contains("pending_queue" as never)) {
          db.deleteObjectStore("pending_queue" as never);
        }
        if (db.objectStoreNames.contains("cached_slots" as never)) {
          db.deleteObjectStore("cached_slots" as never);
        }
      }

      // ── Pending stores ────────────────────────────────────────────────────
      for (const name of [
        OFFLINE_STORE_NAMES.PENDING_VACCINATIONS,
        OFFLINE_STORE_NAMES.PENDING_CHECKINS,
        OFFLINE_STORE_NAMES.PENDING_TOKENS,
      ] as const) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: "id" });
          store.createIndex("status",    "status",    { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      }

      // ── Cache stores ──────────────────────────────────────────────────────
      for (const name of [
        OFFLINE_STORE_NAMES.CACHED_APPOINTMENTS,
        OFFLINE_STORE_NAMES.CACHED_INVENTORY,
        OFFLINE_STORE_NAMES.CACHED_SLOTS,
      ] as const) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: "id" });
          store.createIndex("cachedAt", "cachedAt", { unique: false });
        }
      }
    },

    blocked() {
      console.warn("[IDB] Database upgrade blocked — close other tabs");
    },

    blocking() {
      _db?.close();
      _db = null;
    },
  });

  return _db;
}
