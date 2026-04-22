"use client";

import { UserCheck, AlertCircle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "./StatusBadge";
import type { AppointmentRow } from "./AppointmentsClient";

function isPastSlot(date: string, timeSlot: string): boolean {
  const [start] = timeSlot.split("-");
  const slotTime = new Date(`${date}T${start}:00`);
  return slotTime < new Date();
}

interface Props {
  appointments: AppointmentRow[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onRowClick: (a: AppointmentRow) => void;
  onCheckin: (a: AppointmentRow) => void;
  onNoshow: (a: AppointmentRow) => void;
  onReschedule: (a: AppointmentRow) => void;
}

export function AppointmentTable({
  appointments, loading, page, totalPages,
  onPageChange, onRowClick, onCheckin, onNoshow, onReschedule,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Time</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Patient</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Vaccine</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && appointments.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3.5">
                      <div className="h-3.5 bg-muted rounded animate-pulse w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No appointments found for the selected filters
                </td>
              </tr>
            ) : (
              appointments.map((a) => {
                const past = isPastSlot(a.date, a.timeSlot);
                const canCheckin = !a.checkedIn && ["pending", "confirmed"].includes(a.status);
                const canNoshow = past && ["pending", "confirmed"].includes(a.status) && !a.checkedIn;
                const canReschedule = ["pending", "confirmed", "no_show"].includes(a.status);

                return (
                  <tr
                    key={a.id}
                    onClick={() => onRowClick(a)}
                    className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3.5 text-xs font-mono text-foreground whitespace-nowrap">
                      {a.timeSlot}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-foreground">{a.patientNameMasked}</p>
                      <p className="text-xs text-muted-foreground">NID: ···{a.patientNidLast4 || "—"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-foreground">{a.vaccineType}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={a.checkedIn && a.status !== "completed" ? "confirmed" : a.status} />
                      {a.checkedIn && a.status !== "completed" && (
                        <p className="text-xs text-accent mt-0.5">Checked in</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-muted-foreground">
                        {a.walkin ? "Walk-in" : "Booked"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canCheckin && (
                          <Button
                            size="sm"
                            onClick={() => onCheckin(a)}
                            className="h-7 px-2.5 text-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Check In
                          </Button>
                        )}
                        {canNoshow && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNoshow(a)}
                            className="h-7 px-2.5 text-xs border-danger/40 text-danger hover:bg-danger/10"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            No-Show
                          </Button>
                        )}
                        {canReschedule && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onReschedule(a)}
                            className="h-7 px-2.5 text-xs"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            Reschedule
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
