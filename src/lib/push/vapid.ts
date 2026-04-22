// lib/push/vapid.ts
// VAPID push notification utilities.
// Keys are read from environment variables — never hardcoded.
//
// To generate keys (one-time setup):
//   npx web-push generate-vapid-keys
// Then add to .env.local:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<publicKey>
//   VAPID_PRIVATE_KEY=<privateKey>
//   VAPID_EMAIL=mailto:admin@vaccinationbd.gov.bd

import webpush from "web-push";

// ── VAPID configuration ───────────────────────────────────────────────────────

function getVapidConfig() {
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email      = process.env.VAPID_EMAIL ?? "mailto:admin@vaccinationbd.gov.bd";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys not configured. Run: npx web-push generate-vapid-keys\n" +
      "Then set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.local"
    );
  }

  return { publicKey, privateKey, email };
}

// Lazy-initialize webpush — only called server-side
let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  const { publicKey, privateKey, email } = getVapidConfig();
  webpush.setVapidDetails(`mailto:${email.replace("mailto:", "")}`, publicKey, privateKey);
  initialized = true;
}

// ── Push payload type ─────────────────────────────────────────────────────────

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
}

// ── Subscription shape (matches browser PushSubscription.toJSON()) ────────────

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ── Send a push notification ──────────────────────────────────────────────────

export async function sendPushNotification(
  subscription: PushSubscriptionJSON,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    ensureInitialized();
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 } // 24h TTL — deliver when device comes online
    );
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // 410 Gone = subscription expired/unsubscribed — caller should delete it
    return { success: false, error: message };
  }
}

// ── Get public VAPID key (safe to expose to browser) ─────────────────────────

export function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
  return key;
}
