"use client";

import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils/cn";

interface Report {
  id: string; patientName: string; staffName: string;
  vaccineType: string; doseNumber: number;
  reaction: string; severity: "mild" | "moderate" | "severe";
  createdAt: string;
}

const SEV_STYLE: Record<string, string> = {
  mild:     "bg-muted text-muted-foreground",
  moderate: "bg-warning/20 text-warning",
  severe:   "bg-danger/20 text-danger",
};

export function SideEffectReports() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to,   setTo]   = useState(now.toISOString().slice(0, 10));
  const [reports, setReports] = useState<Report[]>([]);
  const [trend, setTrend] = useState<{ date: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/worker/reports/sideeffects?from=${from}&to=${to}`);
    if (res.ok) {
      const d = await res.json();
      setReports(d.reports);
      setTrend(d.dailyTrend);
      setTotal(d.total);
    }
    setLoading(false);
  }, [from, to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div className="bg-muted/20 rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">Total reports</p>
          <p className="text-lg font-bold text-warning">{total}</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Trend chart */}
          {trend.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Daily Side Effect Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" name="Reports" stroke="var(--warning)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Reports list */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Adverse Reaction Reports</h3>
            </div>
            <div className="divide-y divide-border/50 max-h-[480px] overflow-y-auto">
              {reports.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">No side effect reports for this period</div>
              )}
              {reports.map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{r.vaccineType} · Dose {r.doseNumber}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", SEV_STYLE[r.severity])}>
                        {r.severity}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 mt-0.5">{r.reaction}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Patient: {r.patientName} · Staff: {r.staffName}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
