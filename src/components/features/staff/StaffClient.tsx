"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw } from "lucide-react";
import { StaffDirectoryTable } from "./StaffDirectoryTable";
import { ShiftScheduler } from "./ShiftScheduler";
import { PerformanceMetrics } from "./PerformanceMetrics";
import { StaffRequestForm } from "./StaffRequestForm";
import { StaffProfileDrawer } from "./StaffProfileDrawer";

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
  nidMasked: string | null;
  weekShifts: Record<string, string[]>;
  weekVaccinations: number;
  monthVaccinations: number;
  avgPatientsPerHour: number;
  attendancePercent: number;
}

type Tab = "directory" | "shifts" | "performance" | "requests";

const TABS: { id: Tab; label: string }[] = [
  { id: "directory", label: "Staff Directory" },
  { id: "shifts", label: "Shift Scheduler" },
  { id: "performance", label: "Performance" },
  { id: "requests", label: "Staff Requests" },
];

export function StaffClient() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("directory");
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/worker/staff");
    if (res.ok) {
      const data = await res.json();
      setStaff(data.staff);
      setWeekDates(data.weekDates);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  async function handleShiftChange(staffId: string, date: string, shift: string, action: "assign" | "remove") {
    await fetch("/api/worker/staff/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, date, shift, action }),
    });
    // Optimistic update
    setStaff((prev) =>
      prev.map((s) => {
        if (s.id !== staffId) return s;
        const dayShifts = s.weekShifts[date] ?? [];
        const updated = action === "assign"
          ? [...new Set([...dayShifts, shift])]
          : dayShifts.filter((sh) => sh !== shift);
        return { ...s, weekShifts: { ...s.weekShifts, [date]: updated } };
      })
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Staff Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Staff directory, shift scheduling, performance metrics, and admin requests
          </p>
        </div>
        <button
          onClick={fetchStaff}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Staff", value: staff.length, color: "text-primary" },
            { label: "Active", value: staff.filter((s) => s.isActive).length, color: "text-success" },
            { label: "Vaccinations This Week", value: staff.reduce((a, s) => a + s.weekVaccinations, 0), color: "text-accent" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2.5 px-4 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Tab panels */}
      {!loading && (
        <>
          {tab === "directory" && (
            <StaffDirectoryTable staff={staff} onRowClick={setSelectedStaffId} />
          )}
          {tab === "shifts" && (
            <ShiftScheduler
              staff={staff}
              weekDates={weekDates}
              onShiftChange={handleShiftChange}
            />
          )}
          {tab === "performance" && <PerformanceMetrics staff={staff} />}
          {tab === "requests" && <StaffRequestForm />}
        </>
      )}

      {/* Profile drawer */}
      <StaffProfileDrawer
        staffId={selectedStaffId}
        onClose={() => setSelectedStaffId(null)}
      />
    </div>
  );
}
