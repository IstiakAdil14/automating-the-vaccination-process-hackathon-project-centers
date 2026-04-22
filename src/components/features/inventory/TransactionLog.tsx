"use client";

import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Transaction } from "./InventoryClient";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  inventory_updated: { label: "Received", color: "text-accent" },
  vaccination_recorded: { label: "Administered", color: "text-primary" },
  restock_requested: { label: "Restock Req.", color: "text-warning-foreground" },
};

function actionLabel(action: string, quantityChange: number) {
  if (action === "inventory_updated" && quantityChange < 0) return { label: "Wasted", color: "text-danger" };
  return ACTION_LABELS[action] ?? { label: action, color: "text-muted-foreground" };
}

interface Props {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  filterVaccine: string;
  filterFrom: string;
  filterTo: string;
  vaccineTypes: string[];
  onFilterVaccine: (v: string) => void;
  onFilterFrom: (v: string) => void;
  onFilterTo: (v: string) => void;
  onPageChange: (p: number) => void;
}

export function TransactionLog({
  transactions, total, page, totalPages, loading,
  filterVaccine, filterFrom, filterTo, vaccineTypes,
  onFilterVaccine, onFilterFrom, onFilterTo, onPageChange,
}: Props) {
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Transaction Log
          {total > 0 && <span className="ml-2 text-xs text-muted-foreground font-normal">{total} records</span>}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterVaccine}
            onChange={(e) => onFilterVaccine(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All vaccines</option>
            {vaccineTypes.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <Input type="date" value={filterFrom} onChange={(e) => onFilterFrom(e.target.value)} className="h-8 text-xs w-36" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={filterTo} onChange={(e) => onFilterTo(e.target.value)} className="h-8 text-xs w-36" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Timestamp</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Action</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Vaccine</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Qty Change</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Batch</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff</th>
            </tr>
          </thead>
          <tbody>
            {loading && transactions.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-muted rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const { label, color } = actionLabel(t.action, t.quantityChange);
                return (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(t.timestamp).toLocaleString("en-BD", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className={cn("px-4 py-3 text-xs font-medium", color)}>{label}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{t.vaccineType || "—"}</td>
                    <td className={cn("px-4 py-3 text-xs font-mono text-right", t.quantityChange >= 0 ? "text-accent" : "text-danger")}>
                      {t.quantityChange >= 0 ? "+" : ""}{t.quantityChange}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{t.batchNo || "—"}</td>
                    <td className="px-4 py-3 text-xs text-foreground">{t.staffName}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </section>
  );
}
