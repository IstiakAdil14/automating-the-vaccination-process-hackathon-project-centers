"use client";

import { useState } from "react";
import { X, AlertTriangle, Clock, User, Building2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FraudAlertRow } from "./FraudAlertList";

const TYPE_LABELS: Record<string, string> = {
  duplicate_record:  "Duplicate NID Submission",
  qr_tamper:         "Invalid QR Code Scan",
  excess_doses:      "Same-Dose Repeat Attempt",
  identity_mismatch: "Identity Mismatch on Check-in",
  suspicious_volume: "Suspicious Volume",
};

const SEV_STYLE: Record<string, string> = {
  low:      "bg-muted text-muted-foreground",
  medium:   "bg-warning/20 text-warning",
  high:     "bg-danger/20 text-danger",
  critical: "bg-danger text-white",
};

interface Props {
  alert: FraudAlertRow | null;
  onClose: () => void;
  onResolved: (id: string, newStatus: string) => void;
}

type Action = "false_positive" | "escalate" | "block_patient";

const ACTIONS: { id: Action; label: string; desc: string; style: string }[] = [
  { id: "false_positive", label: "Mark False Positive", desc: "Dismiss — no real threat detected", style: "border-muted text-muted-foreground hover:bg-muted/30" },
  { id: "escalate",       label: "Escalate to Admin",   desc: "Flag for government admin review", style: "border-warning/50 text-warning hover:bg-warning/10" },
  { id: "block_patient",  label: "Block Patient (temp)", desc: "Temporarily suspend patient access", style: "border-danger/50 text-danger hover:bg-danger/10" },
];

export function AlertInvestigationDrawer({ alert, onClose, onResolved }: Props) {
  const [submitting, setSubmitting] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const open = !!alert;

  async function handleAction(action: Action) {
    if (!alert) return;
    setSubmitting(action);
    setError("");
    const res = await fetch(`/api/worker/fraud/${alert.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Failed"); setSubmitting(null); return; }
    onResolved(alert.id, data.status);
    setSubmitting(null);
    setNote("");
    onClose();
  }

  // Build a simple event timeline from context
  const timeline: { label: string; value: string }[] = [];
  if (alert) {
    timeline.push({ label: "Alert raised", value: new Date(alert.createdAt).toLocaleString("en-BD") });
    if (alert.context?.appointmentId) timeline.push({ label: "Appointment ID", value: String(alert.context.appointmentId) });
    if (alert.context?.recordId) timeline.push({ label: "Record ID", value: String(alert.context.recordId) });
    if (alert.context?.qrHash) timeline.push({ label: "QR Hash", value: String(alert.context.qrHash) });
    if (alert.context?.attemptedDose) timeline.push({ label: "Attempted dose", value: String(alert.context.attemptedDose) });
    if (alert.context?.existingRecordId) timeline.push({ label: "Existing record", value: String(alert.context.existingRecordId) });
    if (alert.resolvedAt) timeline.push({ label: "Resolved at", value: new Date(alert.resolvedAt).toLocaleString("en-BD") });
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />}
      <div className={cn(
        "fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l border-border z-50 flex flex-col transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-danger" />
            <h2 className="text-base font-semibold text-foreground">Alert Investigation</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {alert && (
          <div className="flex-1 overflow-y-auto">
            {/* Alert summary */}
            <div className="px-6 py-4 border-b border-border space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">
                  {TYPE_LABELS[alert.type] ?? alert.type}
                </span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", SEV_STYLE[alert.severity])}>
                  {alert.severity}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Patient (masked)</p>
                  </div>
                  <p className="text-sm font-medium text-foreground">{alert.patientNidMasked ?? "Unknown"}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Staff involved</p>
                  </div>
                  <p className="text-sm font-medium text-foreground">{alert.staffName ?? "Unknown"}</p>
                  {alert.staffEmail && <p className="text-xs text-muted-foreground">{alert.staffEmail}</p>}
                </div>
              </div>
            </div>

            {/* Event timeline */}
            <div className="px-6 py-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Event Timeline</p>
              <div className="space-y-2">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                      {i < timeline.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[16px]" />}
                    </div>
                    <div className="pb-2">
                      <p className="text-xs text-muted-foreground">{t.label}</p>
                      <p className="text-sm text-foreground font-mono break-all">{t.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Raw evidence */}
            <div className="px-6 py-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Evidence Payload</p>
              <pre className="text-xs bg-muted/30 rounded-lg p-3 overflow-x-auto text-foreground/80 max-h-40">
                {JSON.stringify(alert.context, null, 2)}
              </pre>
            </div>

            {/* Action note */}
            <div className="px-6 py-4 border-b border-border">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Resolution note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add context for this resolution…"
                className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="px-6 py-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Actions</p>
              {error && <p className="text-xs text-danger mb-2">{error}</p>}
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAction(a.id)}
                  disabled={!!submitting || alert.status === "resolved" || alert.status === "dismissed"}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors disabled:opacity-50",
                    a.style
                  )}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      {submitting === a.id ? "Processing…" : a.label}
                    </p>
                    <p className="text-xs opacity-70">{a.desc}</p>
                  </div>
                </button>
              ))}
              {(alert.status === "resolved" || alert.status === "dismissed") && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  This alert has already been {alert.status}.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
