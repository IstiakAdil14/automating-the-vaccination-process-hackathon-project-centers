// lib/config.ts
// Type-safe environment config validated at boot time via Zod.
// Import `config` anywhere — if a required var is missing the app will
// throw immediately on startup rather than failing silently at runtime.

import { z } from "zod";

const envSchema = z.object({
  // ── NextAuth ──────────────────────────────────────────────────────────
  /** Signs JWT session tokens. Required in all environments. */
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),

  /** Canonical URL of this app (http://localhost:3002 locally). */
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // ── Database ──────────────────────────────────────────────────────────
  /** MongoDB Atlas connection string pointing to shared vaccinationDB. */
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // ── Google Maps ───────────────────────────────────────────────────────
  /** Public Maps API key — safe to expose to the browser. */
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),

  // ── Cron ──────────────────────────────────────────────────────────────
  /** Bearer token protecting internal /api/cron/* routes. */
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),

  // ── Web Push / VAPID ──────────────────────────────────────────────────
  /** VAPID public key sent to the browser for push subscription. */
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),

  /** VAPID private key — never exposed to the browser. */
  VAPID_PRIVATE_KEY: z.string().optional(),

  /** Sender identity for push notifications (mailto: or https:). */
  VAPID_EMAIL: z.string().optional(),

  // ── Email ─────────────────────────────────────────────────────────────
  /** Gmail address used for OTP and alert emails. */
  GMAIL_USER: z.string().email("GMAIL_USER must be a valid email").optional(),

  /** Gmail App Password (not the account password). */
  GMAIL_APP_PASSWORD: z.string().optional(),

  // ── Runtime ───────────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Validate once at module load — throws ZodError with clear messages on failure
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  const issues = _parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`\n[VaccinationBD Centers] Invalid environment variables:\n${issues}\n`);
}

/** Validated, type-safe config singleton. */
export const config = _parsed.data;

// Derived convenience flags
export const isDev = config.NODE_ENV === "development";
export const isProd = config.NODE_ENV === "production";

export type Config = typeof config;
