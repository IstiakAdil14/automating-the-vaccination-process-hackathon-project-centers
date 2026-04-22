"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { VACCINE_TYPES } from "@/lib/constants";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY = {
  vaccineType: VACCINE_TYPES[0] as string,
  quantity: "",
  batchNo: "",
  lotNo: "",
  expiryDate: "",
  deliveryDate: "",
  supplierName: "",
};

export function ReceiveStockDrawer({ open, onClose, onSuccess }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(k: keyof typeof EMPTY, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  }

  async function handleSubmit() {
    if (!form.vaccineType || !form.quantity || !form.batchNo || !form.expiryDate) {
      setError("Vaccine type, quantity, batch number, and expiry date are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/worker/inventory/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to receive stock");
      setForm(EMPTY);
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
          <h2 className="font-semibold text-foreground">Receive Stock</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vaccine Type *</label>
            <select
              value={form.vaccineType}
              onChange={(e) => set("vaccineType", e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {VACCINE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Quantity (vials) *</label>
            <Input type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="e.g. 100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Batch Number *</label>
              <Input value={form.batchNo} onChange={(e) => set("batchNo", e.target.value)} placeholder="e.g. BT-2024-001" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Lot Number</label>
              <Input value={form.lotNo} onChange={(e) => set("lotNo", e.target.value)} placeholder="e.g. LT-001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Expiry Date *</label>
              <Input type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Delivery Date</label>
              <Input type="date" value={form.deliveryDate} onChange={(e) => set("deliveryDate", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Supplier Name</label>
            <Input value={form.supplierName} onChange={(e) => set("supplierName", e.target.value)} placeholder="e.g. MedSupply BD" />
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
          <Button onClick={handleSubmit} loading={saving} className="flex-1">Confirm Receipt</Button>
        </div>
      </div>
    </>
  );
}
