"use client";

import { useEffect } from "react";
import { toast } from "sonner";

const SYNC_TAGS = ["vaccination-sync", "checkin-sync", "token-sync"] as const;

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        reg = registration;

        // Activate waiting SW immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        // Register periodic background sync (Chrome Android)
        if ("periodicSync" in registration) {
          (registration as unknown as {
            periodicSync: { register: (tag: string, opts: object) => Promise<void> };
          }).periodicSync
            .register("vcbd-sync", { minInterval: 5 * 60 * 1000 })
            .catch(() => {}); // permission denied — non-fatal
        }
      })
      .catch((err) => console.warn("[SW] Registration failed:", err));

    // ── Register Background Sync tags when coming online ──────────────────
    async function registerSyncTags() {
      if (!reg || !("sync" in reg)) return;
      const syncReg = reg as unknown as {
        sync: { register: (tag: string) => Promise<void> };
      };
      for (const tag of SYNC_TAGS) {
        await syncReg.sync.register(tag).catch(() => {});
      }
      // Also tell SW to relay SYNC_NOW to all clients (fallback for browsers
      // that don't support Background Sync API)
      navigator.serviceWorker.controller?.postMessage({ type: "SYNC_PENDING" });
    }

    window.addEventListener("online", registerSyncTags);

    // ── Handle messages from SW ───────────────────────────────────────────
    function onSwMessage(event: MessageEvent) {
      const { type, synced, conflicts, failed } = event.data || {};

      if (type === "SYNC_COMPLETE") {
        if (synced > 0) {
          toast.success(`${synced} record${synced !== 1 ? "s" : ""} synced`, { duration: 3000 });
        }
        if (conflicts > 0) {
          toast.warning(`${conflicts} sync conflict${conflicts !== 1 ? "s" : ""} — check Audit`, { duration: 5000 });
        }
        if (failed > 0) {
          toast.error(`${failed} record${failed !== 1 ? "s" : ""} failed to sync`, { duration: 5000 });
        }
        // Dispatch custom event so usePendingCount refreshes
        window.dispatchEvent(new CustomEvent("vcbd:sync-complete"));
      }
    }

    navigator.serviceWorker.addEventListener("message", onSwMessage);

    // Reload when a new SW takes control (ensures fresh assets)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    return () => {
      window.removeEventListener("online", registerSyncTags);
      navigator.serviceWorker.removeEventListener("message", onSwMessage);
    };
  }, []);

  return null;
}
