"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChart2 } from "lucide-react";

interface TokenRow {
  status: string;
  calledAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface Props {
  tokens: TokenRow[];
}

export function AnalyticsPanel({ tokens }: Props) {
  const { avgServiceMin, peakHours, servedPerHour } = useMemo(() => {
    const done = tokens.filter((t) => t.status === "done" && t.calledAt && t.completedAt);

    const avgServiceMin = done.length
      ? Math.round(
          done.reduce((sum, t) => {
            const diff = new Date(t.completedAt!).getTime() - new Date(t.calledAt!).getTime();
            return sum + diff / 60000;
          }, 0) / done.length
        )
      : 0;

    // Build hourly buckets 8–20
    const hourBuckets: Record<number, number> = {};
    for (let h = 8; h <= 20; h++) hourBuckets[h] = 0;

    tokens.forEach((t) => {
      const h = new Date(t.createdAt).getHours();
      if (h >= 8 && h <= 20) hourBuckets[h] = (hourBuckets[h] ?? 0) + 1;
    });

    const peakHours = Object.entries(hourBuckets).map(([hour, count]) => ({
      hour: `${hour}:00`,
      count,
    }));

    const currentHour = new Date().getHours();
    const servedPerHour = done.filter((t) => {
      return new Date(t.completedAt!).getHours() === currentHour;
    }).length;

    return { avgServiceMin, peakHours, servedPerHour };
  }, [tokens]);

  const maxCount = Math.max(...peakHours.map((h) => h.count), 1);

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">Queue Analytics</h2>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-foreground">{avgServiceMin}<span className="text-sm font-normal text-muted-foreground ml-1">min</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg service time</p>
          </div>
          <div className="bg-muted rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold text-foreground">{servedPerHour}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Served this hour</p>
          </div>
        </div>

        {/* Peak hours chart */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Patient arrivals by hour
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={peakHours} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval={1}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {peakHours.map((entry) => (
                  <Cell
                    key={entry.hour}
                    fill={entry.count === maxCount ? "var(--primary)" : "var(--accent-subtle)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
