"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface LogRow {
  id: string;
  staffName: string;
  staffId: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

interface StaffOption { id: string; name: string; }

const ACTION_TYPES = [
  "vaccination_recorded",
  "appointment_checked_in",
  "appointment_cancelled",
  "queue_token_created",
  "queue_status_updated",
  "inventory_updated",
  "restock_requested",
  "fraud_alert_raised",
  "staff_login",
  "staff_logout",
  "slot_configured",
] as const;

const ACTION_LABEL: Record<string, string> = {
  vaccination_recorded:   "Vaccination",
  appointment_checked_in: "Check-in",
  appointment_cancelled:  "Appt Cancelled",
  queue_token_created:    "Queue Token",
  queue_status_updated:   "Queue Update",
  inventory_updated:      "Inventory",
  restock_requested:      "Restock Req",
  fraud_alert_raised:     "Fraud Alert",
  staff_login:            "Login",
  staff_logout:           "Logout",
  slot_configured:        "Slot Config",
};

const ACTION_COLOR: Record<string, string> = {
  vaccination_recorded:   "bg-primary/20 text-primary",
  appointment_checked_in: "bg-accent/20 text-accent",
  fraud_alert_raised:     "bg-danger/20 text-danger",
  staff_login:            "bg-success/20 text-success",
  staff_logout:           "bg-muted text-muted-foreground",
  inventory_updated:      "bg-warning/20 text-warning",
};

export function ActivityLog() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [staffId, setStaffId] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [patientId, setPatientId] = useState("");
  const [showActionPicker, setShowActionPicker] = useState(false);

  const loaderRef = useRef<HTMLDivElement>(null);

  function buildParams(p: number) {
    const params = new URLSearchParams({ page: String(p) });
    if (staffId) params.set("staffId", staffId);
    selectedActions.forEach((a) => params.append("action", a));
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (patientId) params.set("patientId", patientId);
    return params;
  }

  const fetchLogs = useCallback(async (p: number, append = false) => {
    setLoading(true);
    const res = await fetch(`/api/worker/audit/log?${buildParams(p)}`);
    if (res.ok) {
      const data = await res.json();
      setLogs((prev) => append ? [...prev, ...data.logs] : data.logs);
      setStaffList(data.staffList ?? []);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setHasMore(p < data.totalPages);
    }
    setLoading(false);
  }, [staffId, selectedActions, from, to, patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset on filter change
  useEffect(() => {
    setPage(1);
    fetchLogs(1, false);
  }, [staffId, selectedActions, from, to, patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll observer
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loading) {
        const next = page + 1;
        setPage(next);
        fetchLogs(next, true);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, page, fetchLogs]);

  function exportCsv() {
    const params = buildParams(1);
    window.open(`/api/worker/audit/log/export.csv?${params}`, "_blank");
  }

  function toggleAction(a: string) {
    setSelectedActions((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-foreground text-sm">Activity Log</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{total.toLocaleString()} total entries</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-border flex flex-wrap gap-2 items-end">
        {/* Staff filter */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Staff</label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[140px]"
          >
            <option value="">All staff</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Action type multi-select */}
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs text-muted-foreground">Action type</label>
          <button
            onClick={() => setShowActionPicker((v) => !v)}
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground text-left min-w-[140px] flex items-center justify-between gap-2"
          >
            <span>{selectedActions.length === 0 ? "All actions" : `${selectedActions.length} selected`}</span>
            <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          </button>
          {showActionPicker && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 p-2 min-w-[200px] space-y-0.5">
              {ACTION_TYPES.map((a) => (
                <label key={a} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 cursor-pointer text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedActions.includes(a)}
                    onChange={() => toggleAction(a)}
                    className="accent-primary"
                  />
                  {ACTION_LABEL[a] ?? a}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
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

        {/* Patient ID */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Patient ID</label>
          <input type="text" value={patientId} onChange={(e) => setPatientId(e.target.value)}
            placeholder="User ObjectId…"
            className="bg-muted/30 border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-40" />
        </div>

        {/* Clear */}
        {(staffId || selectedActions.length > 0 || from || to || patientId) && (
          <button
            onClick={() => { setStaffId(""); setSelectedActions([]); setFrom(""); setTo(""); setPatientId(""); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-4"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {["Timestamp", "Staff", "Action", "Resource", "IP"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors last:border-0">
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString("en-BD")}
                </td>
                <td className="px-4 py-2.5 text-sm text-foreground">{l.staffName}</td>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    ACTION_COLOR[l.action] ?? "bg-muted text-muted-foreground"
                  )}>
                    {ACTION_LABEL[l.action] ?? l.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  <span>{l.resourceType}</span>
                  {l.resourceId && (
                    <span className="ml-1 font-mono opacity-60">{l.resourceId.slice(-6)}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{l.ip ?? "—"}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No log entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Infinite scroll loader */}
      <div ref={loaderRef} className="flex items-center justify-center py-4">
        {loading && (
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
        {!loading && !hasMore && logs.length > 0 && (
          <p className="text-xs text-muted-foreground">All {total.toLocaleString()} entries loaded</p>
        )}
      </div>
    </div>
  );
}
