"use client";

import { X, UserCheck, AlertCircle, CalendarClock, Clock, Syringe, Hash, Phone, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "./StatusBadge";
import type { AppointmentRow } from "./AppointmentsClient";

function isPastSlot(date: string, timeSlot: string): boolean {
  const [start] = timeSlot.split("-");
  return new Date(`${date}T${start}:00`) < new Date();
}

// Derive a simple status timeline from the appointment state
function buildTimeline(a: AppointmentRow) {
  const events: { label: string; time: string | null; done: boolean }[] = [
    { label: "Booking created", time: a.createdAt, done: true },
    { label: "Confirmed", time: null, done: ["confirmed", "completed"].includes(a.status) || a.checkedIn },
    { label: "Checked in", time: a.checkedInAt, done: a.checkedIn },
    { label: "Completed", time: null, done: a.status === "completed" },
  ];
  if (a.status === "no_show") events.push({ label: "No-show recorded", time: a.updatedAt, done: true });
  if (a.status === "rescheduled") events.push({ label: "Rescheduled", time: a.updatedAt, done: true });
  if (a.status === "cancelled") events.push({ label: "Cancelled", time: a.updatedAt, done: true });
  return events;
}

interface Props {
  appointment: AppointmentRow | null;
  onClose: () => void;
  onCheckin: (a: AppointmentRow) => void;
  onNoshow: (a: AppointmentRow) => void;
  onReschedule: (a: AppointmentRow) => void;
}

export function AppointmentDetailDrawer({ appointment: a, onClose, onCheckin, onNoshow, onReschedule }: Props) {
  const open = !!a;
  const past = a ? isPastSlot(a.date, a.timeSlot) : false;
  const canCheckin = a ? !a.checkedIn && ["pending", "confirmed"].includes(a.status) : false;
  const canNoshow = a ? past && ["pending", "confirmed"].includes(a.status) && !a.checkedIn : false;
  const canReschedule = a ? ["pending", "confirmed", "no_show"].includes(a.status) : false;

  return (
    <>
      <div
        className={cn("fixed inset-0 bg-black/40 z-40 transition-opacity", open ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={onClose}
      />
      <div className={cn(
        "fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-xl transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">Appointment Details</h2>
            {a && <p className="text-xs text-muted-foreground font-mono mt-0.5">{a.id}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {a && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                {a.checkedIn && a.status !== "completed" && (
                  <span className="text-xs text-accent font-medium">✓ Checked in</span>
                )}
                {a.walkin && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Walk-in</span>
                )}
              </div>

              {/* Details grid */}
              <div className="space-y-3">
                {[
                  { icon: Hash, label: "Booking ID", value: a.id, mono: true },
                  { icon: Syringe, label: "Vaccine", value: a.vaccineType },
                  { icon: Clock, label: "Slot", value: `${a.date} · ${a.timeSlot}` },
                  { icon: Phone, label: "Phone", value: a.patientPhoneMasked },
                  { icon: CreditCard, label: "NID (last 4)", value: a.patientNidLast4 ? `···${a.patientNidLast4}` : "—" },
                ].map(({ icon: Icon, label, value, mono }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn("text-sm text-foreground", mono && "font-mono text-xs break-all")}>{value}</p>
                    </div>
                  </div>
                ))}
                {a.notes && (
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
                    <p className="text-sm text-foreground">{a.notes}</p>
                  </div>
                )}
              </div>

              {/* Status timeline */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Timeline</h3>
                <div className="space-y-0">
                  {buildTimeline(a).map((ev, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full mt-1 shrink-0",
                          ev.done ? "bg-primary" : "bg-border"
                        )} />
                        {i < buildTimeline(a).length - 1 && (
                          <div className="w-px flex-1 bg-border min-h-[1.5rem]" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className={cn("text-sm", ev.done ? "text-foreground" : "text-muted-foreground")}>{ev.label}</p>
                        {ev.time && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(ev.time).toLocaleString("en-BD", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            {(canCheckin || canNoshow || canReschedule) && (
              <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2 flex-wrap">
                {canCheckin && (
                  <Button size="sm" onClick={() => onCheckin(a)} className="flex-1">
                    <UserCheck className="w-4 h-4" />
                    Check In
                  </Button>
                )}
                {canReschedule && (
                  <Button size="sm" variant="outline" onClick={() => onReschedule(a)} className="flex-1">
                    <CalendarClock className="w-4 h-4" />
                    Reschedule
                  </Button>
                )}
                {canNoshow && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNoshow(a)}
                    className="flex-1 border-danger/40 text-danger hover:bg-danger/10"
                  >
                    <AlertCircle className="w-4 h-4" />
                    No-Show
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
