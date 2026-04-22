"use client";

import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export interface OfflineBannerProps {
  /** Render as a sticky top banner (default) or inline */
  variant?: "sticky" | "inline";
  className?: string;
}

/**
 * Amber sticky banner shown when offline or when pending records exist.
 * Slides down with Framer Motion on appear.
 * Shows: "Offline — {count} records pending sync" or syncing progress.
 */
export function OfflineBanner({ variant = "sticky", className }: OfflineBannerProps) {
  const { isOnline, pendingCount } = useOfflineStatus();
  const { isSyncing, progress } = useOfflineSync();

  const visible = !isOnline || pendingCount > 0 || isSyncing;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="offline-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className={cn(
            "overflow-hidden w-full",
            variant === "sticky" && "sticky top-0 z-30",
            className
          )}
          role="status"
          aria-live="polite"
          aria-label={
            !isOnline
              ? `Offline — ${pendingCount} records pending sync`
              : isSyncing
              ? "Syncing offline records"
              : `${pendingCount} records pending sync`
          }
        >
          <div
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium",
              !isOnline
                ? "bg-warning-subtle border-b border-warning/30 text-warning-foreground"
                : isSyncing
                ? "bg-primary-50 border-b border-primary/20 text-primary-700"
                : "bg-warning-subtle border-b border-warning/30 text-warning-foreground"
            )}
          >
            <div className="flex items-center gap-2.5">
              {!isOnline ? (
                <>
                  <WifiOff className="w-4 h-4 shrink-0" aria-hidden />
                  <span>
                    Offline
                    {pendingCount > 0 && (
                      <>
                        {" — "}
                        <motion.span
                          key={pendingCount}
                          initial={{ scale: 1.3 }}
                          animate={{ scale: 1 }}
                          className="inline-block font-bold"
                        >
                          {pendingCount}
                        </motion.span>
                        {" "}record{pendingCount !== 1 ? "s" : ""} pending sync
                      </>
                    )}
                  </span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
                  <span>
                    Syncing offline records
                    {progress && (
                      <span className="ml-1 font-normal text-xs opacity-80">
                        ({progress.synced}/{progress.total})
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 shrink-0" aria-hidden />
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
              )}
            </div>

            {/* Synced confirmation */}
            {isOnline && !isSyncing && pendingCount === 0 && (
              <div className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
                All synced
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
