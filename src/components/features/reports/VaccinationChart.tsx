"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import { VACCINE_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

interface DailyCount { date: string; count: number; }
interface ByVaccine  { type: string; count: number; }
interface CompareData { total: number; byVaccine: { type: string; count: number }[] }

interface ReportData {
  from: string; to: string; total: number; sideEffectCount: number;
  dailyCounts: DailyCount[];
  byVaccine: ByVaccine[];
  compareData: CompareData | null;
}

const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16","#ec4899"];

function pct(a: number, b: number) {
  if (b === 0) return null;
  const diff = ((a - b) / b) * 100;
  return diff;
}

export function VaccinationChart() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to,   setTo]   = useState(now.toISOString().slice(0, 10));
  const [vaccineFilter, setVaccineFilter] = useState("");
  const [compareFrom, setCompareFrom] = useState("");
  const [compareTo,   setCompareTo]   = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ from, to });
    if (vaccineFilter) p.set("vaccineType", vaccineFilter);
    if (compareFrom && compareTo) { p.set("compareFrom", compareFrom); p.set("compareTo", compareTo); }
    const res = await fetch(`/api/worker/reports/vaccinations?${p}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [from, to, vaccineFilter, compareFrom, compareTo]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const momMetrics = data?.compareData ? [
    { label: "Total vaccinations", current: data.total, prev: data.compareData.total },
    ...data.byVaccine.map((v) => ({
      label: v.type,
      current: v.count,
      prev: data.compareData!.byVaccine.find((b) => b.type === v.type)?.count ?? 0,
    })),
  ] : [];

  return (
    <div className="space-y-6">
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
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Vaccine type</label>
          <select value={vaccineFilter} onChange={(e) => setVaccineFilter(e.target.value)}
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
            <option value="">All vaccines</option>
            {VACCINE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="border-l border-border pl-3 flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Compare: From</label>
          <input type="date" value={compareFrom} onChange={(e) => setCompareFrom(e.target.value)}
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Compare: To</label>
          <input type="date" value={compareTo} onChange={(e) => setCompareTo(e.target.value)}
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </div>

      {/* KPI strip */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Vaccinations", value: data.total, color: "text-primary" },
            { label: "Side Effect Reports", value: data.sideEffectCount, color: "text-warning" },
            { label: "Vaccine Types", value: data.byVaccine.length, color: "text-accent" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* Daily bar chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Daily Vaccinations</h3>
            {data.dailyCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data for selected period</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.dailyCounts} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                  />
                  <Bar dataKey="count" name="Vaccinations" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie + table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Vaccine Type Breakdown</h3>
              {data.byVaccine.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.byVaccine} dataKey="count" nameKey="type" cx="50%" cy="50%"
                      outerRadius={90} label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {data.byVaccine.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Summary table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Doses by Vaccine</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Vaccine</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Doses</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byVaccine.map((v, i) => (
                    <tr key={v.type} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-2.5 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        {v.type}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{v.count}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {data.total > 0 ? ((v.count / data.total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MoM comparison */}
          {data.compareData && momMetrics.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Month-over-Month Comparison</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {from}–{to} vs {compareFrom}–{compareTo}
                </p>
              </div>
              <div className="divide-y divide-border/50">
                {momMetrics.map(({ label, current, prev }) => {
                  const change = pct(current, prev);
                  return (
                    <div key={label} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-foreground">{label}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-foreground">{current}</span>
                        <span className="text-xs text-muted-foreground">vs {prev}</span>
                        {change !== null && (
                          <span className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            change >= 0 ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                          )}>
                            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
