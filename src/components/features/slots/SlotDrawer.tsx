"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Plus, Trash2, AlertCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VACCINE_TYPES } from "@/lib/constants";
import type { SlotConfigDTO, VaccineAllocationDTO } from "@/types";

interface Props {
  date: string | null; // "YYYY-MM-DD" or null = closed
  existing: SlotConfigDTO | null;
  onClose: () => void;
  onSave: (payload: Omit<SlotConfigDTO, "id" | "booked" | "isBlocked" | "blockId" | "blockReason">) => Promise<void>;
  onUnblock: (blockId: string) => Promise<void>;
}

const DEFAULT_FORM = {
  totalCapacity: 40,
  morningLimit: 20,
  eveningLimit: 20,
  walkinQuota: 5,
  vaccineAllocations: [] as VaccineAllocationDTO[],
};

export function SlotDrawer({ date, existing, onClose, onSave, onUnblock }: Props) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const isPast = !!date && date < today;
  const isBlocked = existing?.isBlocked ?? false;

  useEffect(() => {
    if (!date) return;
    if (existing && !existing.isBlocked) {
      setForm({
        totalCapacity: existing.totalCapacity,
        morningLimit: existing.morningLimit,
        eveningLimit: existing.eveningLimit,
        walkinQuota: existing.walkinQuota,
        vaccineAllocations: existing.vaccineAllocations,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setError(null);
  }, [date, existing]);

  const totalAllocated = form.vaccineAllocations.reduce((s, a) => s + (a.quota || 0), 0);
  const remaining = form.totalCapacity - totalAllocated;

  const validate = useCallback(() => {
    if (form.walkinQuota > form.totalCapacity)
      return "Walk-in quota cannot exceed total capacity";
    if (totalAllocated > form.totalCapacity)
      return "Total vaccine allocations exceed daily capacity";
    if (form.morningLimit + form.eveningLimit > form.totalCapacity)
      return "Shift limits exceed total capacity";
    return null;
  }, [form, totalAllocated]);

  async function handleSave() {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ date: date!, ...form });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnblock() {
    if (!existing?.blockId) return;
    setSaving(true);
    try {
      await onUnblock(existing.blockId);
      onClose();
    } catch {
      setError("Unblock failed");
    } finally {
      setSaving(false);
    }
  }

  function setField<K extends keyof typeof DEFAULT_FORM>(key: K, val: (typeof DEFAULT_FORM)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setError(null);
  }

  function addVaccine() {
    const used = new Set(form.vaccineAllocations.map((a) => a.vaccineType));
    const next = VACCINE_TYPES.find((v) => !used.has(v));
    if (!next) return;
    setField("vaccineAllocations", [...form.vaccineAllocations, { vaccineType: next, quota: 0 }]);
  }

  function updateAllocation(idx: number, field: "vaccineType" | "quota", val: string | number) {
    const updated = form.vaccineAllocations.map((a, i) =>
      i === idx ? { ...a, [field]: val } : a
    );
    setField("vaccineAllocations", updated);
  }

  function removeAllocation(idx: number) {
    setField("vaccineAllocations", form.vaccineAllocations.filter((_, i) => i !== idx));
  }

  const usedVaccines = new Set(form.vaccineAllocations.map((a) => a.vaccineType));
  const availableVaccines = VACCINE_TYPES.filter((v) => !usedVaccines.has(v));

  const dateLabel = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-BD", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-40 transition-opacity",
          date ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-xl transition-transform duration-300",
          date ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">
              {isBlocked ? "Blocked Date" : "Configure Slots"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {isPast && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Past dates are read-only
            </div>
          )}

          {isBlocked && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-3 py-3 space-y-2">
              <div className="flex items-center gap-2 text-danger text-sm font-medium">
                <Lock className="w-4 h-4" />
                This date is blocked
              </div>
              {existing?.blockReason && (
                <p className="text-sm text-muted-foreground">{existing.blockReason}</p>
              )}
              {!isPast && (
                <Button
                  variant="outline"
                  size="sm"
                  loading={saving}
                  onClick={handleUnblock}
                  className="border-danger/40 text-danger hover:bg-danger/10"
                >
                  Unblock this date
                </Button>
              )}
            </div>
          )}

          {!isBlocked && (
            <>
              {/* Daily Capacity */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Daily Capacity</h3>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Total appointments / day
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={form.totalCapacity}
                    onChange={(e) => setField("totalCapacity", Number(e.target.value))}
                    disabled={isPast}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Morning limit
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={form.morningLimit}
                      onChange={(e) => setField("morningLimit", Number(e.target.value))}
                      disabled={isPast}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Evening limit
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={form.eveningLimit}
                      onChange={(e) => setField("eveningLimit", Number(e.target.value))}
                      disabled={isPast}
                    />
                  </div>
                </div>
              </section>

              {/* Walk-in Quota */}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Walk-in Quota</h3>
                <p className="text-xs text-muted-foreground">
                  Slots reserved for walk-ins only (not bookable via citizen app)
                </p>
                <Input
                  type="number"
                  min={0}
                  max={form.totalCapacity}
                  value={form.walkinQuota}
                  onChange={(e) => setField("walkinQuota", Number(e.target.value))}
                  disabled={isPast}
                />
              </section>

              {/* Vaccine Allocations */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Vaccine Allocation</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Remaining:{" "}
                      <span
                        className={cn(
                          "font-medium",
                          remaining < 0 ? "text-danger" : "text-accent"
                        )}
                      >
                        {remaining} / {form.totalCapacity}
                      </span>
                    </p>
                  </div>
                  {!isPast && availableVaccines.length > 0 && (
                    <Button variant="outline" size="sm" onClick={addVaccine}>
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </Button>
                  )}
                </div>

                {form.vaccineAllocations.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    No allocations — all capacity is unallocated
                  </p>
                )}

                <div className="space-y-2">
                  {form.vaccineAllocations.map((alloc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={alloc.vaccineType}
                        onChange={(e) => updateAllocation(idx, "vaccineType", e.target.value)}
                        disabled={isPast}
                        className="flex-1 h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      >
                        <option value={alloc.vaccineType}>{alloc.vaccineType}</option>
                        {VACCINE_TYPES.filter(
                          (v) => !usedVaccines.has(v) || v === alloc.vaccineType
                        ).map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min={0}
                        value={alloc.quota}
                        onChange={(e) => updateAllocation(idx, "quota", Number(e.target.value))}
                        disabled={isPast}
                        className="w-20"
                      />
                      {!isPast && (
                        <button
                          onClick={() => removeAllocation(idx)}
                          className="p-1.5 rounded-md hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Allocation bar */}
                {form.vaccineAllocations.length > 0 && (
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        remaining < 0 ? "bg-danger" : "bg-primary"
                      )}
                      style={{
                        width: `${Math.min((totalAllocated / Math.max(form.totalCapacity, 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}
              </section>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isPast && !isBlocked && (
          <div className="px-5 py-4 border-t border-border shrink-0 flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              Save
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
