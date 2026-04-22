// lib/db/mongoose.ts
// Singleton MongoDB connection for the Centers portal.
// Caches the connection on the global object to survive Next.js hot-reloads in dev.
// Implements retry logic with exponential back-off for transient Atlas failures.

import mongoose from "mongoose";
import { DB_NAME } from "@/lib/constants";

const MONGODB_URI = process.env.MONGODB_URI;

// ── Connection options ────────────────────────────────────────────────────────
const CONNECT_OPTIONS: mongoose.ConnectOptions = {
  dbName: DB_NAME,
  maxPoolSize: 10,       // Max concurrent connections in the pool
  minPoolSize: 2,        // Keep at least 2 connections warm
  serverSelectionTimeoutMS: 5_000,  // Fail fast if Atlas is unreachable
  socketTimeoutMS: 45_000,
  connectTimeoutMS: 10_000,
  heartbeatFrequencyMS: 10_000,
};

// ── Global cache type ─────────────────────────────────────────────────────────
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  readyState: number; // mirrors mongoose.connection.readyState
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

if (!global.__mongooseCache) {
  global.__mongooseCache = { conn: null, promise: null, readyState: 0 };
}

const cache = global.__mongooseCache;

// ── Retry helper ──────────────────────────────────────────────────────────────
async function connectWithRetry(uri: string, retries = 3, delayMs = 1_000): Promise<typeof mongoose> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, CONNECT_OPTIONS);
      cache.readyState = mongoose.connection.readyState;
      return conn;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = delayMs * 2 ** (attempt - 1); // exponential back-off
      console.warn(`[DB] Connection attempt ${attempt} failed. Retrying in ${wait}ms…`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("[DB] All connection attempts exhausted");
}

// ── Connection state helpers ──────────────────────────────────────────────────
export function getConnectionState() {
  const states: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState] ?? "unknown";
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function connectDB(): Promise<typeof mongoose> {
  // Already connected — return cached instance
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;

  // Connection in flight — wait for it
  if (cache.promise) {
    cache.conn = await cache.promise;
    return cache.conn;
  }

  // New connection
  cache.promise = connectWithRetry(MONGODB_URI ?? (() => { throw new Error("[DB] MONGODB_URI is not defined"); })());
  cache.conn = await cache.promise;

  // Attach event listeners once
  mongoose.connection.on("error", (err) => console.error("[DB] Connection error:", err));
  mongoose.connection.on("disconnected", () => {
    console.warn("[DB] Disconnected — clearing cache");
    cache.conn = null;
    cache.promise = null;
  });

  return cache.conn;
}
