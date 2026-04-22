"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  open: boolean;
  onClose: () => void;
  onBlock: (startDate: string, endDate: string, reason?: string) => Promise<void>;
}

export function BlockDatesDialog({ open, onClose, onBlock }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (endDate < startDate) {
      setError("End date must be on or after start date");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onBlock(startDate, endDate, reason || undefined);
      setReason("");
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Block failed");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Block Dates</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start date</label>
              <Input
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setError(null); }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End date</label>
              <Input
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setError(null); }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Reason <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Public holiday, maintenance..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

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
          <Button
            onClick={handleSubmit}
            loading={loading}
            className="flex-1 bg-danger hover:bg-danger/90 text-white"
          >
            Block dates
          </Button>
        </div>
      </div>
    </div>
  );
}
