"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QueueBoard } from "./QueueBoard";
import { TokenForm } from "./TokenForm";
import { CheckinPanel } from "./CheckinPanel";
import { QueueTable } from "./QueueTable";
import { AnalyticsPanel } from "./AnalyticsPanel";

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
  allTokens: {
    id: string;
    tokenNumber: number;
    patientName: string;
    patientPhone: string;
    vaccineType: string;
    status: string;
    calledAt: string | null;
    completedAt: string | null;
    createdAt: string;
    isAppointment: boolean;
    missedCalls: number;
  }[];
}

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch { /* AudioContext not available */ }
}

const EMPTY_SNAPSHOT: QueueSnapshot = {
  serving: null,
  next5: [],
  waitingCount: 0,
  doneCount: 0,
  allTokens: [],
};

export function QueueManager() {
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(EMPTY_SNAPSHOT);
  const [callingNext, setCallingNext] = useState(false);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const prevServingRef = useRef<number | null>(null);

  const fetchSnapshot = useCallback(async () => {
    const res = await fetch("/api/worker/queue/stream");
    // SSE — handled below; this is just a fallback poll
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/worker/queue/stream");

    es.onmessage = (e) => {
      if (e.data === "connected" || e.data === "refresh") {
        // On "refresh" signal, re-open connection to get fresh snapshot
        // The stream sends full snapshot on connect, so just reconnect
        es.close();
        reconnect();
        return;
      }
      try {
        const data: QueueSnapshot = JSON.parse(e.data);
        setSnapshot(data);

        // Play chime when a new token is called
        if (
          chimeEnabled &&
          data.serving?.tokenNumber !== undefined &&
          data.serving.tokenNumber !== prevServingRef.current
        ) {
          playChime();
        }
        prevServingRef.current = data.serving?.tokenNumber ?? null;
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => es.close();

    return () => es.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chimeEnabled]);

  // Reconnect helper — triggers re-mount of SSE via key trick
  const [sseKey, setSseKey] = useState(0);
  const reconnect = useCallback(() => setSseKey((k) => k + 1), []);

  // Re-subscribe when sseKey changes
  useEffect(() => {
    if (sseKey === 0) return;
    const es = new EventSource("/api/worker/queue/stream");
    es.onmessage = (e) => {
      if (e.data === "connected" || e.data === "refresh") return;
      try {
        const data: QueueSnapshot = JSON.parse(e.data);
        setSnapshot(data);
        if (chimeEnabled && data.serving?.tokenNumber !== prevServingRef.current) {
          playChime();
        }
        prevServingRef.current = data.serving?.tokenNumber ?? null;
      } catch { /* ignore */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [sseKey, chimeEnabled]);

  const callNext = async () => {
    setCallingNext(true);
    // Optimistic: assume next waiting token becomes serving
    if (snapshot.next5[0]) {
      const next = snapshot.next5[0];
      setSnapshot((prev) => ({
        ...prev,
        serving: { ...next, status: "called", calledAt: new Date().toISOString() },
        next5: prev.next5.slice(1),
        waitingCount: Math.max(0, prev.waitingCount - 1),
      }));
      if (chimeEnabled) playChime();
    }
    await fetch("/api/worker/queue/next", { method: "POST" });
    setCallingNext(false);
  };

  return (
    <div className="space-y-6">
      {/* Top row: Board + Token form + Checkin */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <QueueBoard
            snapshot={snapshot}
            chimeEnabled={chimeEnabled}
            onToggleChime={() => setChimeEnabled((v) => !v)}
            onCallNext={callNext}
            callingNext={callingNext}
          />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <TokenForm />
          <CheckinPanel />
        </div>
        <div className="lg:col-span-1">
          <AnalyticsPanel tokens={snapshot.allTokens} />
        </div>
      </div>

      {/* Full queue table */}
      <QueueTable tokens={snapshot.allTokens} />
    </div>
  );
}
