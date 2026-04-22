"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface TokenSummary {
  id: string;
  tokenNumber: number;
  patientName: string;
  vaccineType: string;
  isAppointment?: boolean;
  missedCalls?: number;
}

interface QueueSnapshot {
  serving: (TokenSummary & { status: string; calledAt?: string }) | null;
  next5: TokenSummary[];
  waitingCount: number;
  doneCount: number;
}

interface Props {
  snapshot: QueueSnapshot;
  chimeEnabled: boolean;
  onToggleChime: () => void;
  onCallNext: () => void;
  callingNext: boolean;
}

function pad(n: number) {
  return String(n).padStart(3, "0");
}

export function QueueBoard({ snapshot, chimeEnabled, onToggleChime, onCallNext, callingNext }: Props) {
  const [displayMode, setDisplayMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setDisplayMode(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleDisplay = async () => {
    if (!displayMode) {
      await containerRef.current?.requestFullscreen();
      setDisplayMode(true);
    } else {
      await document.exitFullscreen();
      setDisplayMode(false);
    }
  };

  if (displayMode) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 bg-navy-950 flex flex-col items-center justify-center z-50 text-white"
      >
        <button
          onClick={toggleDisplay}
          className="absolute top-6 right-6 text-white/50 hover:text-white"
        >
          <Minimize2 className="w-6 h-6" />
        </button>

        <p className="text-2xl font-medium text-white/60 mb-4 tracking-widest uppercase">
          Now Serving
        </p>

        {snapshot.serving ? (
          <div className="text-center">
            <div className="text-[12rem] font-black leading-none text-primary tabular-nums">
              #{pad(snapshot.serving.tokenNumber)}
            </div>
            <p className="text-4xl font-semibold mt-4">{snapshot.serving.patientName}</p>
            <p className="text-2xl text-white/60 mt-2">{snapshot.serving.vaccineType}</p>
          </div>
        ) : (
          <div className="text-[8rem] font-black text-white/20">—</div>
        )}

        <div className="mt-16 flex gap-12 text-center">
          <div>
            <p className="text-6xl font-bold text-warning">{snapshot.waitingCount}</p>
            <p className="text-xl text-white/50 mt-1">Waiting</p>
          </div>
          <div>
            <p className="text-6xl font-bold text-accent">{snapshot.doneCount}</p>
            <p className="text-xl text-white/50 mt-1">Served Today</p>
          </div>
        </div>

        {snapshot.next5.length > 0 && (
          <div className="mt-12">
            <p className="text-lg text-white/40 text-center mb-4 uppercase tracking-widest">Up Next</p>
            <div className="flex gap-4">
              {snapshot.next5.map((t) => (
                <div
                  key={t.id}
                  className="bg-white/10 rounded-2xl px-8 py-4 text-center"
                >
                  <p className="text-4xl font-bold">#{pad(t.tokenNumber)}</p>
                  <p className="text-sm text-white/50 mt-1">{t.vaccineType}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Live Queue Board</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleChime}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={chimeEnabled ? "Mute chime" : "Enable chime"}
          >
            {chimeEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleDisplay}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Display mode"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Now Serving */}
      <div className="bg-navy-900 px-6 py-8 text-center">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Now Serving</p>
        {snapshot.serving ? (
          <>
            <div className="text-7xl font-black text-primary tabular-nums">
              #{pad(snapshot.serving.tokenNumber)}
            </div>
            <p className="text-lg font-medium text-white mt-3">{snapshot.serving.patientName}</p>
            <p className="text-sm text-white/50 mt-1">{snapshot.serving.vaccineType}</p>
            {(snapshot.serving.missedCalls ?? 0) > 0 && (
              <span className="inline-block mt-2 text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
                Called {snapshot.serving.missedCalls}x
              </span>
            )}
          </>
        ) : (
          <p className="text-4xl font-black text-white/20">—</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="px-5 py-3 text-center">
          <p className="text-2xl font-bold text-warning">{snapshot.waitingCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Waiting</p>
        </div>
        <div className="px-5 py-3 text-center">
          <p className="text-2xl font-bold text-accent">{snapshot.doneCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Served Today</p>
        </div>
      </div>

      {/* Next 5 */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Up Next</p>
        {snapshot.next5.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Queue is empty</p>
        ) : (
          <div className="space-y-2">
            {snapshot.next5.map((t, i) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg",
                  i === 0 ? "bg-primary/10 border border-primary/20" : "bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("text-sm font-bold tabular-nums", i === 0 ? "text-primary" : "text-foreground")}>
                    #{pad(t.tokenNumber)}
                  </span>
                  <span className="text-sm text-foreground truncate max-w-[120px]">{t.patientName}</span>
                  {t.isAppointment && (
                    <span className="text-xs bg-info/10 text-info px-1.5 py-0.5 rounded">Appt</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{t.vaccineType}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Call Next */}
      <div className="px-5 pb-5">
        <Button
          className="w-full"
          size="lg"
          onClick={onCallNext}
          loading={callingNext}
          disabled={snapshot.waitingCount === 0}
        >
          Call Next Patient
        </Button>
      </div>
    </div>
  );
}
