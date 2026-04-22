"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";
import { StatusBadge } from "./StatusBadge";

export interface QueueToken {
  id: string;
  tokenNumber: number;
  patientName: string;
  vaccineType: string;
  isAppointment?: boolean;
  missedCalls?: number;
  status?: string;
}

export interface QueueDisplayProps {
  /** Currently serving token */
  serving: (QueueToken & { calledAt?: string }) | null;
  /** Next tokens in queue */
  next: QueueToken[];
  waitingCount: number;
  doneCount: number;
  /** Show the "Call Next" button */
  showCallNext?: boolean;
  onCallNext?: () => void;
  callingNext?: boolean;
  chimeEnabled?: boolean;
  onToggleChime?: () => void;
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(3, "0");
}

/** Full-screen TV display — shown when fullscreen is active */
function FullscreenView({
  serving,
  next,
  waitingCount,
  doneCount,
  onExit,
}: {
  serving: QueueDisplayProps["serving"];
  next: QueueToken[];
  waitingCount: number;
  doneCount: number;
  onExit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-navy-950 flex flex-col items-center justify-center z-50 text-white select-none">
      <button
        onClick={onExit}
        className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
        aria-label="Exit fullscreen"
      >
        <Minimize2 className="w-6 h-6" />
      </button>

      <p className="text-2xl font-medium text-white/50 mb-6 tracking-[0.3em] uppercase">
        Now Serving
      </p>

      <AnimatePresence mode="wait">
        {serving ? (
          <motion.div
            key={serving.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="text-[11rem] font-black leading-none text-primary tabular-nums drop-shadow-lg">
              #{pad(serving.tokenNumber)}
            </div>
            <p className="text-4xl font-semibold mt-4 text-white">{serving.patientName}</p>
            <p className="text-2xl text-white/50 mt-2">{serving.vaccineType}</p>
            {(serving.missedCalls ?? 0) > 0 && (
              <span className="inline-block mt-3 text-lg bg-warning/20 text-warning px-4 py-1 rounded-full">
                Called {serving.missedCalls}×
              </span>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[8rem] font-black text-white/10"
          >
            —
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="mt-16 flex gap-16 text-center">
        <div>
          <p className="text-6xl font-bold text-warning tabular-nums">{waitingCount}</p>
          <p className="text-xl text-white/40 mt-1">Waiting</p>
        </div>
        <div>
          <p className="text-6xl font-bold text-success tabular-nums">{doneCount}</p>
          <p className="text-xl text-white/40 mt-1">Served Today</p>
        </div>
      </div>

      {/* Up next */}
      {next.length > 0 && (
        <div className="mt-14">
          <p className="text-base text-white/30 text-center mb-5 uppercase tracking-[0.25em]">Up Next</p>
          <div className="flex gap-4">
            {next.slice(0, 5).map((t) => (
              <div key={t.id} className="bg-white/8 rounded-2xl px-8 py-4 text-center border border-white/10">
                <p className="text-4xl font-bold tabular-nums">#{pad(t.tokenNumber)}</p>
                <p className="text-sm text-white/40 mt-1">{t.vaccineType}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function QueueDisplay({
  serving,
  next,
  waitingCount,
  doneCount,
  showCallNext = true,
  onCallNext,
  callingNext = false,
  chimeEnabled,
  onToggleChime,
  className,
}: QueueDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  async function enterFullscreen() {
    await containerRef.current?.requestFullscreen();
    setIsFullscreen(true);
  }

  async function exitFullscreen() {
    await document.exitFullscreen();
    setIsFullscreen(false);
  }

  if (isFullscreen) {
    return (
      <FullscreenView
        serving={serving}
        next={next}
        waitingCount={waitingCount}
        doneCount={doneCount}
        onExit={exitFullscreen}
      />
    );
  }

  return (
    <div ref={containerRef} className={cn("bg-card rounded-xl border border-border overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground text-sm">Live Queue</h2>
        <div className="flex items-center gap-1.5">
          {onToggleChime !== undefined && (
            <button
              onClick={onToggleChime}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label={chimeEnabled ? "Mute chime" : "Enable chime"}
            >
              {chimeEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={enterFullscreen}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Enter display mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Now Serving */}
      <div className="bg-navy-900 px-6 py-8 text-center" aria-live="polite" aria-atomic="true">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Now Serving</p>
        <AnimatePresence mode="wait">
          {serving ? (
            <motion.div
              key={serving.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-7xl font-black text-primary tabular-nums">
                #{pad(serving.tokenNumber)}
              </div>
              <p className="text-lg font-medium text-white mt-3">{serving.patientName}</p>
              <p className="text-sm text-white/50 mt-1">{serving.vaccineType}</p>
              {(serving.missedCalls ?? 0) > 0 && (
                <span className="inline-block mt-2 text-xs bg-warning/20 text-warning px-2.5 py-0.5 rounded-full">
                  Called {serving.missedCalls}×
                </span>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-4xl font-black text-white/20"
            >
              —
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="px-5 py-3 text-center">
          <p className="text-2xl font-bold text-warning tabular-nums">{waitingCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Waiting</p>
        </div>
        <div className="px-5 py-3 text-center">
          <p className="text-2xl font-bold text-success tabular-nums">{doneCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Served Today</p>
        </div>
      </div>

      {/* Up Next */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Up Next</p>
        {next.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Queue is empty</p>
        ) : (
          <div className="space-y-2">
            {next.slice(0, 5).map((t, i) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg",
                  i === 0 ? "bg-primary-50 border border-primary/20" : "bg-muted/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("text-sm font-bold tabular-nums", i === 0 ? "text-primary" : "text-foreground")}>
                    #{pad(t.tokenNumber)}
                  </span>
                  <span className="text-sm text-foreground truncate max-w-[120px]">{t.patientName}</span>
                  {t.isAppointment && (
                    <StatusBadge status="confirmed" labelOnly className="text-[10px] px-1.5 py-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{t.vaccineType}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call Next */}
      {showCallNext && (
        <div className="px-5 pb-5">
          <Button
            className="w-full"
            size="lg"
            onClick={onCallNext}
            loading={callingNext}
            disabled={waitingCount === 0}
            aria-label="Call next patient"
          >
            Call Next Patient
          </Button>
        </div>
      )}
    </div>
  );
}
