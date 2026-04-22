"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  vaccineType: string;
  quantity: number;
  threshold: number;
  batchNo: string;
  expiryDate: string;
  isLowStock: boolean;
  isCritical: boolean;
}

interface Props {
  items: InventoryItem[];
}

function StockBar({ quantity, threshold }: { quantity: number; threshold: number }) {
  const pct = threshold > 0 ? Math.min(100, (quantity / (threshold * 2)) * 100) : 100;
  const color = quantity === 0 ? "bg-danger" : quantity <= 5 ? "bg-danger" : quantity <= threshold ? "bg-warning" : "bg-accent";
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StockIcon({ quantity, threshold }: { quantity: number; threshold: number }) {
  if (quantity === 0) return <XCircle className="w-4 h-4 text-danger" />;
  if (quantity <= 5 || quantity <= threshold) return <AlertTriangle className="w-4 h-4 text-warning" />;
  return <CheckCircle2 className="w-4 h-4 text-accent" />;
}

export function InventoryPanel({ items }: Props) {
  const [requesting, setRequesting] = useState<string | null>(null);

  async function requestRestock(vaccineType: string) {
    setRequesting(vaccineType);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaccineType, action: "restock_request" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Restock request sent for ${vaccineType}`);
    } catch {
      toast.error("Failed to send restock request");
    } finally {
      setRequesting(null);
    }
  }

  const sorted = [...items].sort((a, b) => a.quantity - b.quantity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Inventory</h2>
        </div>
        {items.some((i) => i.isCritical || i.quantity === 0) && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-danger-subtle text-danger-foreground">
            Action needed
          </span>
        )}
      </div>

      <div className="divide-y divide-border">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No inventory data</p>
        ) : (
          sorted.map((item) => {
            const isOut = item.quantity === 0;
            const isAlert = item.isCritical || item.isLowStock;
            return (
              <div key={item.id} className={cn("px-5 py-3.5 space-y-2", isOut && "bg-danger-subtle/30")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StockIcon quantity={item.quantity} threshold={item.threshold} />
                    <span className="text-sm font-medium text-foreground">{item.vaccineType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-bold",
                      isOut ? "text-danger" : item.isCritical ? "text-danger" : item.isLowStock ? "text-warning" : "text-accent"
                    )}>
                      {item.quantity} doses
                    </span>
                    {isAlert && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={requesting === item.vaccineType}
                        onClick={() => requestRestock(item.vaccineType)}
                        className="h-7 text-xs px-2 gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Restock
                      </Button>
                    )}
                  </div>
                </div>
                <StockBar quantity={item.quantity} threshold={item.threshold} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Batch: {item.batchNo}</span>
                  <span>Expires: {new Date(item.expiryDate).toLocaleDateString("en-BD")}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
