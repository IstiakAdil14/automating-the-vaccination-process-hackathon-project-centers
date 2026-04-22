"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { AppointmentRow } from "./AppointmentsClient";

// Common time slots — in a real deployment these would come from SlotConfig
const TIME_SLOTS = [
  "08:00-08:30", "08:30-09:00", "09:00-09:30", "09:30-10:00",
  "10:00-10:30", "10:30-11:00", "11:00-11:30", "11:30-12:00",
  "12:00-12:30", "12:30-13:00", "13:00-13:30", "13:30-14:00",
  "14:00-14:30", "14:30-15:00", "15:00-15:30", "15:30-16:00",
  "16:00-16:30", "16:30-17:00",
];

interface Props {
  appointment: AppointmentRow | null;
  onClose: () => void;
  onConfirm: (a: AppointmentRow, newDate: string, newTimeSlot: string) => Promise<void>;
}

export function RescheduleModal({ appointment: a, onClose, onConfirm }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [newDate, setNewDate] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState(TIME_SLOTS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (a) {
      // Default to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNewDate(tomorrow.toISOString().slice(0, 10));
      setNewTimeSlot(a.timeSlot || TIME_SLOTS[0]);
      setError(null);
    }
  }, [a]);

  if (!a) return null;

  async function handleConfirm() {
    if (!newDate || !newTimeSlot) { setError("Select a date and time slot"); return; }
    if (newDate < today) { setError("Cannot reschedule to a past date"); return; }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(a!, newDate, newTimeSlot);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Reschedule Appointment</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5 bg-muted rounded-lg px-3 py-2">
          <p>Patient: <span className="text-foreground font-medium">{a.patientNameMasked}</span></p>
          <p>Current slot: <span className="text-foreground">{a.date} · {a.timeSlot}</span></p>
          <p>Vaccine: <span className="text-foreground">{a.vaccineType}</span></p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">New Date *</label>
          <Input
            type="date"
            min={today}
            value={newDate}
            onChange={(e) => { setNewDate(e.target.value); setError(null); }}
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">New Time Slot *</label>
          <select
            value={newTimeSlot}
            onChange={(e) => { setNewTimeSlot(e.target.value); setError(null); }}
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Availability is checked server-side. The patient will be notified of the change.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button loading={saving} onClick={handleConfirm} className="flex-1">
            Confirm Reschedule
          </Button>
        </div>
      </div>
    </div>
  );
}
