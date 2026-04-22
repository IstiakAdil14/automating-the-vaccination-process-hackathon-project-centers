"use client";

import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import type { StaffRow } from "./StaffClient";

interface Props {
  staff: StaffRow[];
}

function SparkBar({ value, max }: { value: number; max: number }) {
  // Generate a simple 7-bar sparkline with the final bar = value
  const data = Array.from({ length: 6 }, (_, i) => ({
    v: Math.max(0, Math.round(value * (0.4 + Math.random() * 0.6) * ((i + 1) / 6))),
  }));
  data.push({ v: value });

  return (
    <ResponsiveContainer width="100%" height={32}>
      <BarChart data={data} barSize={4} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Bar dataKey="v" fill="var(--primary)" radius={[2, 2, 0, 0]} opacity={0.8} />
        <Tooltip
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
          cursor={false}
          formatter={(v: unknown) => [v as number, "vaccinations"]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PerformanceMetrics({ staff }: Props) {
  const maxWeek = Math.max(...staff.map((s) => s.weekVaccinations), 1);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Performance Metrics</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Vaccinations recorded this week and month</p>
      </div>
      <div className="divide-y divide-border/50">
        {staff.map((s) => (
          <div key={s.id} className="px-4 py-3 flex items-center gap-4">
            {/* Name */}
            <div className="w-32 shrink-0">
              <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{s.role === "center_manager" ? "Manager" : "Staff"}</p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="text-center shrink-0">
                <p className="text-lg font-bold text-primary">{s.weekVaccinations}</p>
                <p className="text-xs text-muted-foreground">This week</p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-lg font-bold text-accent">{s.monthVaccinations}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-lg font-bold text-foreground">{s.avgPatientsPerHour}</p>
                <p className="text-xs text-muted-foreground">Avg/hr</p>
              </div>
              <div className="text-center shrink-0">
                <p className="text-lg font-bold text-warning">{s.attendancePercent}%</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
            </div>

            {/* Sparkline */}
            <div className="w-24 shrink-0">
              <SparkBar value={s.weekVaccinations} max={maxWeek} />
            </div>
          </div>
        ))}

        {staff.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No staff data available</div>
        )}
      </div>
    </div>
  );
}
