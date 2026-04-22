"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays } from "lucide-react";
import { VACCINE_TYPES } from "@/lib/constants";
import { FilterBar } from "./FilterBar";
import { AppointmentTable } from "./AppointmentTable";
import { AppointmentDetailDrawer } from "./AppointmentDetailDrawer";
import { RescheduleModal } from "./RescheduleModal";
import { NoShowDialog } from "./NoShowDialog";
import { ExportButton } from "./ExportButton";
import { Toast } from "./Toast";

export interface AppointmentRow {
  id: string;
  patientNameMasked: string;
  patientPhoneMasked: string;
  patientNidLast4: string;
  vaccineType: string;
  date: string;
  timeSlot: string;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  walkin: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Filters {
  date: string;
  status: string;
  vaccineTypes: string[];
  shift: string;
  q: string;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

const DEFAULT_FILTERS: Filters = {
  date: todayStr(),
  status: "",
  vaccineTypes: [],
  shift: "",
  q: "",
};

export function AppointmentsClient() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<AppointmentRow | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentRow | null>(null);
  const [noshowTarget, setNoshowTarget] = useState<AppointmentRow | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchData = useCallback(async (f = filters, p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ date: f.date, page: String(p) });
    if (f.status) params.set("status", f.status);
    if (f.shift) params.set("shift", f.shift);
    if (f.q) params.set("q", f.q);
    f.vaccineTypes.forEach((v) => params.append("vaccineType", v));

    const res = await fetch(`/api/worker/appointments?${params}`);
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.appointments);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => { fetchData(filters, page); }, [filters, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters(next: Filters) {
    setFilters(next);
    setPage(1);
  }

  async function handleCheckin(appt: AppointmentRow) {
    const res = await fetch(`/api/worker/appointments/${appt.id}/checkin`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) { showToast(json.error ?? "Check-in failed", "error"); return; }
    showToast(`Checked in — Token #${String(json.tokenNumber).padStart(3, "0")} · ${json.patientName}`);
    fetchData(filters, page);
    if (selected?.id === appt.id) setSelected((s) => s ? { ...s, status: "confirmed", checkedIn: true } : s);
  }

  async function handleNoshow(appt: AppointmentRow, reason: string) {
    const res = await fetch(`/api/worker/appointments/${appt.id}/noshow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) { showToast(json.error ?? "Failed", "error"); return; }
    showToast("Marked as no-show. Patient notified.");
    setNoshowTarget(null);
    fetchData(filters, page);
    if (selected?.id === appt.id) setSelected((s) => s ? { ...s, status: "no_show" } : s);
  }

  async function handleReschedule(appt: AppointmentRow, newDate: string, newTimeSlot: string) {
    const res = await fetch(`/api/worker/appointments/${appt.id}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDate, newTimeSlot }),
    });
    const json = await res.json();
    if (!res.ok) { showToast(json.error ?? "Reschedule failed", "error"); return; }
    showToast(`Rescheduled to ${newDate} at ${newTimeSlot}`);
    setRescheduleTarget(null);
    fetchData(filters, page);
    if (selected?.id === appt.id) setSelected((s) => s ? { ...s, date: newDate, timeSlot: newTimeSlot, status: "confirmed" } : s);
  }

  const dateLabel = new Date(filters.date + "T00:00:00").toLocaleDateString("en-BD", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Appointments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
        </div>
        <ExportButton filters={filters} />
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        vaccineTypes={[...VACCINE_TYPES]}
        onChange={applyFilters}
        total={total}
        loading={loading}
      />

      {/* Table */}
      <AppointmentTable
        appointments={appointments}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={setSelected}
        onCheckin={handleCheckin}
        onNoshow={(a) => setNoshowTarget(a)}
        onReschedule={(a) => setRescheduleTarget(a)}
      />

      {/* Detail drawer */}
      <AppointmentDetailDrawer
        appointment={selected}
        onClose={() => setSelected(null)}
        onCheckin={handleCheckin}
        onNoshow={(a) => { setSelected(null); setNoshowTarget(a); }}
        onReschedule={(a) => { setSelected(null); setRescheduleTarget(a); }}
      />

      {/* No-show dialog */}
      <NoShowDialog
        appointment={noshowTarget}
        onClose={() => setNoshowTarget(null)}
        onConfirm={handleNoshow}
      />

      {/* Reschedule modal */}
      <RescheduleModal
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleReschedule}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
