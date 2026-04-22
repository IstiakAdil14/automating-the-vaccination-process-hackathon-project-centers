"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ExpiryBatch } from "./InventoryClient";

interface WastageDialogProps {
  batch: ExpiryBatch;
  onClose: () => void;
  onSuccess: () => void;
}

function WastageDialog({ batch, onClose, onSuccess }: WastageDialogProps) {
  const [quantity, setQuantity] = useState(String(batch.quantity));
  const [reason, setReason] = useState("Expired");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const qty = Number(quantity);
    if (!qty || qty <= 0) { setError("Enter a valid quantity"); return; }
    if (qty > batch.quantity) { setError("Cannot exceed available quantity"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/worker/inventory/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: batch.id, quantity: qty, reason }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Report Wastage</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>Vaccine: <span className="text-foreground font-medium">{batch.vaccineType}</span></p>
          <p>Batch: <span className="text-foreground font-mono">{batch.batchNo}</span></p>
          <p>Available: <span className="text-foreground font-medium">{batch.quantity} vials</span></p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Quantity to write off *</label>
          <Input type="number" min={1} max={batch.quantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Expired, damaged" />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSubmit}
            loading={saving}
            className="flex-1 bg-danger hover:opacity-90 text-white"
          >
            Confirm Wastage
          </Button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  batches: ExpiryBatch[];
  loading: boolean;
  onWastageReported: () => void;
}

export function ExpiryTable({ batches, loading, onWastageReported }: Props) {
  const [wastageTarget, setWastageTarget] = useState<ExpiryBatch | null>(null);

  const expiredOrSoon = batches.filter((b) => b.daysUntilExpiry <= 30);

  if (!loading && expiredOrSoon.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <h2 className="text-sm font-semibold text-foreground">Expiry Tracking</h2>
        <span className="text-xs text-muted-foreground">— batches expiring within 30 days or already expired</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Vaccine</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Batch</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Lot</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Qty</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Expiry Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-3 bg-muted rounded animate-pulse w-16" /></td>
                  ))}
                </tr>
              ))
            ) : (
              expiredOrSoon.map((b) => (
                <tr key={b.id} className={cn("border-b border-border", b.isExpired ? "bg-danger/5" : "bg-warning/5")}>
                  <td className="px-4 py-3 text-xs font-medium text-foreground">{b.vaccineType}</td>
                  <td className="px-4 py-3 text-xs font-mono text-foreground">{b.batchNo}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.lotNo || "—"}</td>
                  <td className="px-4 py-3 text-xs text-right font-medium text-foreground">{b.quantity}</td>
                  <td className="px-4 py-3 text-xs text-foreground whitespace-nowrap">
                    {new Date(b.expiryDate).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      b.isExpired
                        ? "bg-danger-subtle text-danger-foreground"
                        : "bg-warning-subtle text-warning-foreground"
                    )}>
                      {b.isExpired ? "Expired" : `${b.daysUntilExpiry}d left`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {b.isExpired && b.quantity > 0 && (
                      <button
                        onClick={() => setWastageTarget(b)}
                        className="flex items-center gap-1 text-xs text-danger hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Report Wastage
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {wastageTarget && (
        <WastageDialog
          batch={wastageTarget}
          onClose={() => setWastageTarget(null)}
          onSuccess={() => { setWastageTarget(null); onWastageReported(); }}
        />
      )}
    </section>
  );
}
