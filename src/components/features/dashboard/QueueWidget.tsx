"use client";

import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, RefreshCw, Syringe } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface QueueData {
  queueLength: number;
  inProgress: number;
  completedToday: number;
  avgWaitMinutes: number;
  next3: { id: string; tokenNumber: number; patientName: string; vaccineType: string; status: string }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_STYLES: Record<string, string> = {
  waiting: "bg-muted text-muted-foreground",
  called: "bg-warning-subtle text-warning-foreground",
  in_progress: "bg-accent-subtle text-accent-foreground",
};

export function QueueWidget() {
  const { data, isLoading, isValidating } = useSWR<QueueData>(
    "/api/worker/queue",
    fetcher,
    { refreshInterval: 15_000, revalidateOnFocus: true }
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Live Queue</h2>
        </div>
        <div className="flex items-center gap-2">
          {isValidating && <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />}
          <span className="text-xs text-muted-foreground">Refreshes every 15s</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Waiting", value: data?.queueLength ?? "—", color: "text-warning" },
            { label: "In Progress", value: data?.inProgress ?? "—", color: "text-primary" },
            { label: "Done Today", value: data?.completedToday ?? "—", color: "text-accent" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg bg-muted px-3 py-2.5 text-center">
              <p className={cn("text-xl font-bold", color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Avg wait */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Avg wait: <span className="font-medium text-foreground">{data?.avgWaitMinutes ?? 0} min</span></span>
        </div>

        {/* Next 3 tokens */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Up</p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : data?.next3?.length ? (
            <AnimatePresence>
              {data.next3.map((token, i) => (
                <motion.div
                  key={token.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {token.tokenNumber}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{token.patientName}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Syringe className="w-3 h-3" />
                        {token.vaccineType}
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_STYLES[token.status] ?? "bg-muted text-muted-foreground")}>
                    {token.status.replace("_", " ")}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">Queue is empty</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
