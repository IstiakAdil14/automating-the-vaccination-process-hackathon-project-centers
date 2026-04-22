"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { SlotConfigDTO } from "@/types";

interface Props {
  open: boolean;
  sourceDate: string;
  config: Omit<SlotConfigDTO, "id" | "booked" | "isBlocked" | "blockId" | "blockReason"> | null;
  onClose: () => void;
  onApply: (
    config: Omit<SlotConfigDTO, "id" | "booked" | "isBlocked" | "blockId" | "blockReason">,
    days: number
  ) => Promise<void>;
}

export function BulkApplyDialog({ open, sourceDate, config, onClose, onApply }: Props) {
  const [days, setDays] = useState<7 | 30>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    if (!config) return;
    setLoading(true);
    setError(null);
    try {
      await onApply(config, days);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk apply failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open || !config) return null;

  const endDate = new Date(sourceDate + "T00:00:00");
  endDate.setDate(endDate.getDate() + days);
  const endLabel = endDate.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Bulk Apply Configuration</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Apply the configuration from{" "}
          <span className="font-medium text-foreground">
            {new Date(sourceDate + "T00:00:00").toLocaleDateString("en-BD", {
              day: "numeric",
              month: "short",
            })}
          </span>{" "}
          to the next:
        </p>

        <div className="flex gap-3">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                days === d
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted text-foreground"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>

        <div className="bg-muted rounded-lg px-3 py-2.5 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Capacity / day</span>
            <span className="font-medium">{config.totalCapacity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Walk-in quota</span>
            <span className="font-medium">{config.walkinQuota}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Applies until</span>
            <span className="font-medium">{endLabel}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          This will overwrite existing configurations for future dates. Blocked dates will not be
          affected.
        </p>

        {error && (
          <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleApply} loading={loading} className="flex-1">
            Apply to {days} days
          </Button>
        </div>
      </div>
    </div>
  );
}
