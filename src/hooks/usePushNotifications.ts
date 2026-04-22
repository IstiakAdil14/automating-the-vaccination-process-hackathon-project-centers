"use client";

import { useState, useEffect, useCallback } from "react";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export interface PushState {
  permission:   PushPermission;
  subscribed:   boolean;
  subscribing:  boolean;
  subscribe:    () => Promise<void>;
  unsubscribe:  () => Promise<void>;
}

// Convert a base64url VAPID public key to a Uint8Array for the browser API
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(): PushState {
  const [permission,  setPermission]  = useState<PushPermission>("default");
  const [subscribed,  setSubscribed]  = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  // Check current state on mount
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as PushPermission);

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription()
    ).then((sub) => {
      setSubscribed(!!sub);
    }).catch(() => {});
  }, []);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setSubscribing(true);

    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") return;

      // 2. Get VAPID public key from server
      const keyRes = await fetch("/api/worker/push/subscribe");
      if (!keyRes.ok) throw new Error("Could not fetch VAPID key");
      const { vapidPublicKey } = await keyRes.json();

      // 3. Subscribe via PushManager
      const reg = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Save subscription to server
      const saveRes = await fetch("/api/worker/push/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subscription: pushSub.toJSON() }),
      });

      if (saveRes.ok) setSubscribed(true);
    } catch (err) {
      console.warn("[Push] Subscribe failed:", err);
    } finally {
      setSubscribing(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    setSubscribing(true);

    try {
      const reg    = await navigator.serviceWorker.ready;
      const pushSub = await reg.pushManager.getSubscription();
      if (!pushSub) { setSubscribed(false); return; }

      // Remove from server first
      await fetch("/api/worker/push/subscribe", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ endpoint: pushSub.endpoint }),
      });

      // Then unsubscribe from browser
      await pushSub.unsubscribe();
      setSubscribed(false);
    } catch (err) {
      console.warn("[Push] Unsubscribe failed:", err);
    } finally {
      setSubscribing(false);
    }
  }, []);

  return { permission, subscribed, subscribing, subscribe, unsubscribe };
}
