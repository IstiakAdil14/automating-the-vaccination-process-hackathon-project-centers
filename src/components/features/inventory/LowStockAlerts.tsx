"use client";

import { useState } from "react";
import { AlertTriangle, Settings2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { StockCard } from "./InventoryClient";
import type { VaccineType } from "@/lib/constants";

interface ThresholdEditorProps {
  vaccineType: string;
  current: number;
  onSaved: () => void;
}

function ThresholdEditor({ vaccineType, current, onSaved }: ThresholdEditorProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(current));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/worker/inventory/threshold", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaccineType, threshold: Number(value) }),
    });
    setSaving(false);
    setOpen(false);
    onSaved();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Threshold: {current}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-20 text-xs"
      />
      <button
        onClick={save}
        disabled={saving}
        className="p-1 rounded bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        <Check className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface Props {
  cards: StockCard[];
  onRestock: (vaccineType: VaccineType) => void;
  onThresholdSaved: () => void;
}

export function LowStockAlerts({ cards, onRestock, onThresholdSaved }: Props) {
  const alerts = cards.filter((c) => c.totalQty <= c.threshold);
  if (alerts.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        Low Stock Alerts
        <span className="text-xs font-normal text-muted-foreground">({alerts.length} vaccine{alerts.length > 1 ? "s" : ""} below threshold)</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map((c) => (
          <div
            key={c.vaccineType}
            className="bg-warning-subtle border border-warning/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-semibold text-warning-foreground truncate">{c.vaccineType}</p>
              <p className="text-xs text-warning-foreground/80">
                {c.totalQty} vials remaining
              </p>
              <ThresholdEditor
                vaccineType={c.vaccineType}
                current={c.threshold}
                onSaved={onThresholdSaved}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRestock(c.vaccineType as VaccineType)}
              className="shrink-0 border-warning/50 text-warning-foreground hover:bg-warning/10"
            >
              Request Restock
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
