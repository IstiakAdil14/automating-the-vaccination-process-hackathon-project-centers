"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cn } from "@/lib/utils/cn";

export function OfflineBanner() {
  const { isOnline, pendingCount } = useOfflineStatus();
  const { isSyncing, lastSyncAt, progress } = useOfflineSync();

  // Compact inline version used in the Sidebar
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isOnline ? "online" : "offline"}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
          isOnline
            ? pendingCount > 0
              ? "bg-warning/20 text-warning"
              : "bg-accent/20 text-accent"
            : "bg-warning/20 text-warning"
        )}
      >
        {isOnline ? (
          isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Syncing
              {progress && (
                <span className="ml-0.5">
                  {progress.synced}/{progress.total}
                </span>
              )}
            </>
          ) : pendingCount > 0 ? (
            <>
              <RefreshCw className="w-3 h-3" />
              <span>
                <motion.span
                  key={pendingCount}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  className="inline-block"
                >
                  {pendingCount}
                </motion.span>
                {" "}pending
              </span>
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3" />
              {lastSyncAt ? "Synced" : "Online"}
            </>
          )
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            Offline
            {pendingCount > 0 && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="ml-0.5"
              >
                — {pendingCount} pending
              </motion.span>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Full-width banner variant — shown at top of page when offline ─────────────

export function OfflineTopBanner() {
  const { isOnline, pendingCount } = useOfflineStatus();
  const { isSyncing, progress } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={cn(
          "w-full overflow-hidden",
          isOnline ? "bg-warning/10 border-b border-warning/30" : "bg-warning/15 border-b border-warning/40"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm text-warning font-medium">
            {isOnline ? (
              isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>
                    Syncing offline records…
                    {progress && ` (${progress.synced}/${progress.total})`}
                  </span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>
                    Back online —{" "}
                    <motion.span
                      key={pendingCount}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="inline-block font-bold"
                    >
                      {pendingCount}
                    </motion.span>
                    {" "}record{pendingCount !== 1 ? "s" : ""} pending sync
                  </span>
                </>
              )
            ) : (
              <>
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>
                  Offline — records are being saved locally.{" "}
                  {pendingCount > 0 && (
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      className="inline-block font-bold"
                    >
                      {pendingCount} pending
                    </motion.span>
                  )}
                </span>
              </>
            )}
          </div>

          {isOnline && !isSyncing && pendingCount === 0 && (
            <div className="flex items-center gap-1.5 text-xs text-accent">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All synced
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
