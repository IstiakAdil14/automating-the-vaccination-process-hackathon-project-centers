"use client";

import { useState } from "react";
import { SkipForward, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

interface TokenRow {
  id: string;
  tokenNumber: number;
  patientName: string;
  patientPhone: string;
  vaccineType: string;
  status: string;
  isAppointment: boolean;
  missedCalls: number;
}

interface Props {
  tokens: TokenRow[];
}

const STATUS_STYLES: Record<string, string> = {
  waiting: "bg-info/10 text-info",
  called: "bg-warning/10 text-warning",
  in_progress: "bg-primary/10 text-primary",
  done: "bg-accent/10 text-accent-foreground",
  skipped: "bg-muted text-muted-foreground",
  deferred: "bg-danger/10 text-danger",
};

export function QueueTable({ tokens }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [noShowTarget, setNoShowTarget] = useState<TokenRow | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});

  const activeTokens = tokens.filter((t) => !["done", "deferred"].includes(optimistic[t.id] ?? t.status));

  const skip = async (token: TokenRow) => {
    setLoadingId(token.id);
    // Optimistic: move to end visually
    setOptimistic((p) => ({ ...p, [token.id]: "waiting" }));
    await fetch(`/api/worker/queue/skip/${token.id}`, { method: "POST" });
    setLoadingId(null);
  };

  const confirmNoShow = async () => {
    if (!noShowTarget) return;
    setLoadingId(noShowTarget.id);
    setOptimistic((p) => ({ ...p, [noShowTarget.id]: "deferred" }));
    await fetch(`/api/worker/queue/noshow/${noShowTarget.id}`, { method: "POST" });
    setNoShowTarget(null);
    setLoadingId(null);
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Queue Management</h2>
          <span className="ml-auto text-xs text-muted-foreground">{activeTokens.length} active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Token</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Patient</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Vaccine</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Missed</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tokens.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No tokens today
                  </td>
                </tr>
              )}
              {tokens.map((t) => {
                const status = optimistic[t.id] ?? t.status;
                const isDone = ["done", "deferred"].includes(status);
                return (
                  <tr key={t.id} className={cn("transition-opacity", isDone && "opacity-40")}>
                    <td className="px-4 py-3 font-bold tabular-nums">
                      #{String(t.tokenNumber).padStart(3, "0")}
                      {t.isAppointment && (
                        <span className="ml-1.5 text-xs bg-info/10 text-info px-1 rounded">Appt</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{t.patientName}</p>
                      <p className="text-xs text-muted-foreground">{t.patientPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.vaccineType}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
                        {status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {t.missedCalls > 0 && (
                        <span className={cn("text-xs font-bold", t.missedCalls >= 3 ? "text-danger" : "text-warning")}>
                          {t.missedCalls}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!isDone && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => skip(t)}
                            disabled={loadingId === t.id}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Skip (move to end)"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setNoShowTarget(t)}
                            disabled={loadingId === t.id}
                            className="p-1.5 rounded hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                            title="Mark no-show"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* No-show confirmation dialog */}
      {noShowTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-foreground mb-2">Mark as No-Show?</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Token <strong>#{String(noShowTarget.tokenNumber).padStart(3, "0")}</strong> — {noShowTarget.patientName}
            </p>
            {noShowTarget.missedCalls >= 2 && (
              <p className="text-xs text-danger mt-1">
                This patient has been called {noShowTarget.missedCalls + 1} times.
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setNoShowTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={confirmNoShow} loading={loadingId === noShowTarget.id}>
                Confirm No-Show
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
