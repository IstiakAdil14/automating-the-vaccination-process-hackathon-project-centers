"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AppointmentRow } from "./AppointmentsClient";

const REASONS = [
  "Did not arrive for scheduled appointment",
  "Patient called to cancel after slot time",
  "Patient arrived too late — slot expired",
  "Patient refused vaccination on arrival",
  "Other",
];

interface Props {
  appointment: AppointmentRow | null;
  onClose: () => void;
  onConfirm: (a: AppointmentRow, reason: string) => Promise<void>;
}

export function NoShowDialog({ appointment: a, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState(REASONS[0]);
  const [saving, setSaving] = useState(false);

  if (!a) return null;

  async function handleConfirm() {
    setSaving(true);
    await onConfirm(a!, reason);
    setSaving(false);
    setReason(REASONS[0]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-danger" />
            <h3 className="font-semibold text-foreground">Mark as No-Show</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Patient: <span className="text-foreground font-medium">{a.patientNameMasked}</span></p>
          <p>Slot: <span className="text-foreground">{a.date} · {a.timeSlot}</span></p>
          <p>Vaccine: <span className="text-foreground">{a.vaccineType}</span></p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          The patient will be notified via the citizen app.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            loading={saving}
            onClick={handleConfirm}
            className="flex-1 bg-danger hover:opacity-90 text-white"
          >
            Confirm No-Show
          </Button>
        </div>
      </div>
    </div>
  );
}
