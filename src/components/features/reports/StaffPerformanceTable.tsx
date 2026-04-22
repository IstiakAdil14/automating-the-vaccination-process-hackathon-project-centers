"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StaffRow {
  id: string; name: string; role: string; isActive: boolean;
  vaccinations: number; daysAttended: number;
  avgPatientsPerHour: number; attendancePercent: number;
}

type SortKey = "name" | "vaccinations" | "daysAttended" | "avgPatientsPerHour" | "attendancePercent";

export function StaffPerformanceTable() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to,   setTo]   = useState(now.toISOString().slice(0, 10));
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("vaccinations");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/worker/reports/staff?from=${from}&to=${to}`);
    if (res.ok) setStaff((await res.json()).staff);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { fetch_(); }, [fetch_]);

  function sort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...staff].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const cmp = typeof aVal === "string" ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-foreground">Staff Performance</h3>
        <div className="flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {[
                  { key: "name" as SortKey, label: "Name" },
                  { key: "vaccinations" as SortKey, label: "Vaccinations" },
                  { key: "daysAttended" as SortKey, label: "Days Attended" },
                  { key: "avgPatientsPerHour" as SortKey, label: "Avg/hr" },
                  { key: "attendancePercent" as SortKey, label: "Attendance %" },
                ].map(({ key, label }) => (
                  <th key={key} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    <button
                      onClick={() => sort(key)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      {label}
                      <ArrowUpDown className={cn("w-3 h-3", sortKey === key && "text-primary")} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors last:border-0">
                  <td className="px-4 py-2.5">
                    <div>
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{s.role === "center_manager" ? "Manager" : "Staff"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-primary">{s.vaccinations}</td>
                  <td className="px-4 py-2.5 text-foreground">{s.daysAttended}</td>
                  <td className="px-4 py-2.5 text-foreground">{s.avgPatientsPerHour}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      s.attendancePercent >= 80 ? "bg-success/20 text-success" :
                      s.attendancePercent >= 50 ? "bg-warning/20 text-warning" :
                      "bg-danger/20 text-danger"
                    )}>
                      {s.attendancePercent}%
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No staff data for selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
