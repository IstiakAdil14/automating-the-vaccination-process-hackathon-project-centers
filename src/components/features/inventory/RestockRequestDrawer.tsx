"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VACCINE_TYPES } from "@/lib/constants";
import type { VaccineType } from "@/lib/constants";

interface Props {
  open: boolean;
  initialVaccine: VaccineType | "";
  onClose: () => void;
  onSuccess: () => void;
}

export function RestockRequestDrawer({ open, initialVaccine, onClose, onSuccess }: Props) {
  const [vaccineType, setVaccineType] = useState<string>(initialVaccine || VACCINE_TYPES[0]);
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "high">("normal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setVaccineType(initialVaccine || VACCINE_TYPES[0]);
      setRequestedQuantity("");
      setNotes("");
      setUrgency("normal");
      setError(null);
    }
  }, [open, initialVaccine]);

  async function handleSubmit() {
    if (!vaccineType || !requestedQuantity || Number(requestedQuantity) <= 0) {
      setError("Vaccine type and quantity are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/worker/inventory/restock-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaccineType, requestedQuantity: Number(requestedQuantity), notes, urgency }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-semibold text-foreground">Request Restock</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vaccine Type *</label>
            <select
              value={vaccineType}
              onChange={(e) => setVaccineType(e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {VACCINE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Requested Quantity (vials) *</label>
            <Input
              type="number"
              min={1}
              value={requestedQuantity}
              onChange={(e) => setRequestedQuantity(e.target.value)}
              placeholder="e.g. 200"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Urgency</label>
            <div className="flex gap-3">
              {(["normal", "high"] as const).map((u) => (
                <label key={u} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value={u}
                    checked={urgency === u}
                    onChange={() => setUrgency(u)}
                    className="accent-primary"
                  />
                  <span className="text-sm capitalize text-foreground">{u === "high" ? "Urgent" : "Normal"}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional context for the admin..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={saving} className="flex-1">Submit Request</Button>
        </div>
      </div>
    </>
  );
}
