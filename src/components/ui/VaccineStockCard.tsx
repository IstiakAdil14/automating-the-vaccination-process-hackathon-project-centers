"use client";

import { AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface VaccineStockCardProps {
  vaccineType: string;
  totalQty: number;
  threshold: number;
  dosesThisMonth?: number;
  nearestExpiry?: string | null;
  nearestExpiryBatch?: string | null;
  daysRemaining?: number | null;
  /** Override status — computed from qty/threshold if omitted */
  status?: "ok" | "low" | "critical";
  onClick?: () => void;
  className?: string;
}

const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function CircularProgress({
  pct,
  status,
}: {
  pct: number;
  status: "ok" | "low" | "critical";
}) {
  const clamped = Math.min(Math.max(pct, 0), 1);
  const offset = CIRCUMFERENCE * (1 - clamped);

  const trackColor = "var(--border)";
  const fillColor =
    status === "critical" ? "#E24B4A"
    : status === "low"    ? "#EF9F27"
    : "#639922";

  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      className="shrink-0"
      role="img"
      aria-label={`${Math.round(clamped * 100)}% of threshold`}
    >
      {/* Track */}
      <circle
        cx="36" cy="36" r={RADIUS}
        fill="none"
        stroke={trackColor}
        strokeWidth="6"
      />
      {/* Fill */}
      <circle
        cx="36" cy="36" r={RADIUS}
        fill="none"
        stroke={fillColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      {/* Percentage label */}
      <text
        x="36" y="36"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="13"
        fontWeight="700"
        fill={fillColor}
      >
        {Math.round(clamped * 100)}%
      </text>
    </svg>
  );
}

const STATUS_STYLES = {
  ok:       { border: "border-success/30", badge: "bg-success-subtle text-success-foreground", dot: "bg-success" },
  low:      { border: "border-warning/40", badge: "bg-warning-subtle text-warning-foreground", dot: "bg-warning" },
  critical: { border: "border-danger/40",  badge: "bg-danger-subtle text-danger-foreground",   dot: "bg-danger"  },
};

const STATUS_LABEL = { ok: "OK", low: "Low Stock", critical: "Critical" };

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function VaccineStockCard({
  vaccineType,
  totalQty,
  threshold,
  dosesThisMonth,
  nearestExpiry,
  nearestExpiryBatch,
  daysRemaining,
  status: statusProp,
  onClick,
  className,
}: VaccineStockCardProps) {
  const pct = threshold > 0 ? totalQty / threshold : 0;

  const status: "ok" | "low" | "critical" =
    statusProp ??
    (pct <= 0.2 ? "critical" : pct <= 0.5 ? "low" : "ok");

  const s = STATUS_STYLES[status];

  const expiryDays = nearestExpiry ? daysUntil(nearestExpiry) : null;
  const expiryWarning = expiryDays !== null && expiryDays <= 30;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && onClick()}
      className={cn(
        "bg-card border rounded-xl p-4 space-y-4 transition-shadow",
        s.border,
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="font-semibold text-sm text-foreground truncate">{vaccineType}</span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
            s.badge
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot)} aria-hidden />
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* Progress + qty */}
      <div className="flex items-center gap-4">
        <CircularProgress pct={pct} status={status} />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <p className="text-xs text-muted-foreground">Vials on hand</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{totalQty.toLocaleString()}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Threshold: {threshold.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {dosesThisMonth !== undefined && (
          <div>
            <p className="text-muted-foreground">Doses this month</p>
            <p className="font-semibold text-foreground tabular-nums">{dosesThisMonth.toLocaleString()}</p>
          </div>
        )}
        {daysRemaining !== null && daysRemaining !== undefined && (
          <div>
            <p className="text-muted-foreground">Days of stock</p>
            <p className={cn(
              "font-semibold tabular-nums",
              daysRemaining <= 7 ? "text-danger" : daysRemaining <= 14 ? "text-warning-foreground" : "text-foreground"
            )}>
              {daysRemaining}d
            </p>
          </div>
        )}
      </div>

      {/* Expiry indicator */}
      {nearestExpiry && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
            expiryWarning
              ? "bg-warning-subtle text-warning-foreground"
              : "bg-muted/40 text-muted-foreground"
          )}
        >
          {expiryWarning && <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />}
          <span>
            Nearest expiry:{" "}
            <span className="font-medium">
              {new Date(nearestExpiry).toLocaleDateString("en-BD", {
                day: "numeric", month: "short", year: "2-digit",
              })}
            </span>
            {expiryDays !== null && (
              <span className="ml-1 opacity-70">({expiryDays}d)</span>
            )}
          </span>
          {nearestExpiryBatch && (
            <span className="ml-auto font-mono opacity-60 truncate max-w-[80px]">
              {nearestExpiryBatch}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
