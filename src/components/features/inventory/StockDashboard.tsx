"use client";

import { cn } from "@/lib/utils/cn";
import type { StockCard } from "./InventoryClient";

const STATUS_STYLES = {
  green: { border: "border-accent/30", badge: "bg-accent/10 text-accent-foreground", dot: "bg-accent" },
  amber: { border: "border-warning/40", badge: "bg-warning-subtle text-warning-foreground", dot: "bg-warning" },
  red:   { border: "border-danger/40",  badge: "bg-danger-subtle text-danger-foreground",  dot: "bg-danger"  },
};

function Skeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse">
      <div className="h-4 w-24 bg-muted rounded" />
      <div className="h-8 w-16 bg-muted rounded" />
      <div className="h-3 w-32 bg-muted rounded" />
    </div>
  );
}

interface Props { cards: StockCard[]; loading: boolean; }

export function StockDashboard({ cards, loading }: Props) {
  if (loading && cards.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-3">Stock Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const s = STATUS_STYLES[c.status];
          return (
            <div key={c.vaccineType} className={cn("bg-card border rounded-xl p-4 space-y-3", s.border)}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{c.vaccineType}</span>
                <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full", s.badge)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                  {c.status === "green" ? "OK" : c.status === "amber" ? "Low" : "Critical"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Vials on hand</p>
                  <p className="text-2xl font-bold text-foreground">{c.totalQty}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Doses this month</p>
                  <p className="text-2xl font-bold text-foreground">{c.dosesThisMonth}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Days of stock</p>
                  <p className="font-medium text-foreground">
                    {c.daysRemaining !== null ? `${c.daysRemaining}d` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nearest expiry</p>
                  <p className={cn("font-medium", c.status === "red" ? "text-danger" : c.status === "amber" ? "text-warning-foreground" : "text-foreground")}>
                    {c.nearestExpiry
                      ? new Date(c.nearestExpiry).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "2-digit" })
                      : "—"}
                  </p>
                </div>
              </div>

              {c.nearestExpiryBatch && (
                <p className="text-xs text-muted-foreground truncate">Batch: {c.nearestExpiryBatch}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
