"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, GitMerge, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ConflictRow {
  id: string;
  recordType: string;
  status: string;
  attempts: number;
  error: string | null;
  offlineVersion: Record<string, unknown>;
  serverVersion: Record<string, unknown> | null;
  createdAt: string;
  lastAttemptAt: string | null;
}

type Resolution = "keep_offline" | "keep_server" | "manual_review";

const RES_OPTIONS: { id: Resolution; label: string; style: string }[] = [
  { id: "keep_server",    label: "Keep Server",    style: "border-accent/50 text-accent hover:bg-accent/10" },
  { id: "keep_offline",   label: "Keep Offline",   style: "border-primary/50 text-primary hover:bg-primary/10" },
  { id: "manual_review",  label: "Manual Review",  style: "border-warning/50 text-warning hover:bg-warning/10" },
];

// Render a simple diff between two objects — highlight keys that differ
function DiffView({ offline, server }: { offline: Record<string, unknown>; server: Record<string, unknown> | null }) {
  const keys = Array.from(new Set([...Object.keys(offline), ...Object.keys(server ?? {})]));

  return (
    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 overflow-x-auto">
        <p className="text-primary font-semibold mb-2 font-sans">Offline version</p>
        {keys.map((k) => {
          const val = offline[k];
          const diff = server && server[k] !== val;
          return (
            <div key={k} className={cn("flex gap-2", diff && "text-warning")}>
              <span className="text-muted-foreground shrink-0">{k}:</span>
              <span className="break-all">{val === undefined ? "—" : JSON.stringify(val)}</span>
            </div>
          );
        })}
      </div>
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 overflow-x-auto">
        <p className="text-accent font-semibold mb-2 font-sans">Server version</p>
        {server ? keys.map((k) => {
          const val = server[k];
          const diff = offline[k] !== val;
          return (
            <div key={k} className={cn("flex gap-2", diff && "text-warning")}>
              <span className="text-muted-foreground shrink-0">{k}:</span>
              <span className="break-all">{val === undefined ? "—" : JSON.stringify(val)}</span>
            </div>
          );
        }) : (
          <p className="text-muted-foreground italic">No server record found</p>
        )}
      </div>
    </div>
  );
}

export function SyncConflictLog() {
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/worker/audit/sync-conflicts");
    if (res.ok) setConflicts((await res.json()).conflicts);
    setLoading(false);
  }, []);

  useEffect(() => { fetchConflicts(); }, [fetchConflicts]);

  async function resolve(id: string, resolution: Resolution) {
    setResolving(id);
    await fetch("/api/worker/audit/sync-conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolution }),
    });
    setConflicts((prev) => prev.filter((c) => c.id !== id));
    setResolving(null);
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-warning" />
          <h2 className="font-semibold text-foreground text-sm">Sync Conflict Log</h2>
          {conflicts.length > 0 && (
            <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium">
              {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={fetchConflicts}
          disabled={loading}
          className="p-1.5 rounded-lg border border-border hover:bg-muted/30 transition-colors"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", loading && "animate-spin")} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && conflicts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <GitMerge className="w-8 h-8 opacity-30" />
          <p className="text-sm">No sync conflicts — all records are in sync</p>
        </div>
      )}

      <div className="divide-y divide-border/50">
        {conflicts.map((c) => (
          <div key={c.id} className="px-5 py-4">
            {/* Summary row */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{c.recordType}</span>
                  <span className="text-xs bg-danger/20 text-danger px-2 py-0.5 rounded-full font-medium">
                    {c.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{c.attempts} attempt{c.attempts !== 1 ? "s" : ""}</span>
                </div>
                {c.error && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-danger shrink-0" />
                    <p className="text-xs text-danger">{c.error}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  Created offline: {new Date(c.createdAt).toLocaleString("en-BD")}
                  {c.lastAttemptAt && ` · Last attempt: ${new Date(c.lastAttemptAt).toLocaleString("en-BD")}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setExpanded((prev) => prev === c.id ? null : c.id)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  {expanded === c.id ? "Hide diff" : "View diff"}
                </button>
                {RES_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => resolve(c.id, r.id)}
                    disabled={resolving === c.id}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors disabled:opacity-50",
                      r.style
                    )}
                  >
                    {resolving === c.id ? "…" : r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Diff view */}
            {expanded === c.id && (
              <div className="mt-3">
                <DiffView offline={c.offlineVersion} server={c.serverVersion} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
