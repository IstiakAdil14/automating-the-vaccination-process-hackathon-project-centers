"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Syringe, UserPlus, LayoutGrid, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface KPI {
  today: number;
  yesterday: number;
}

interface Props {
  totalAppointments: KPI;
  completed: KPI;
  walkins: KPI;
  slotsRemaining: KPI;
}

function trend(today: number, yesterday: number) {
  if (yesterday === 0) return "neutral";
  return today > yesterday ? "up" : today < yesterday ? "down" : "neutral";
}

function TrendBadge({ today, yesterday }: KPI) {
  const t = trend(today, yesterday);
  const diff = today - yesterday;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-medium",
      t === "up" && "text-accent",
      t === "down" && "text-danger",
      t === "neutral" && "text-muted-foreground",
    )}>
      {t === "up" && <TrendingUp className="w-3 h-3" />}
      {t === "down" && <TrendingDown className="w-3 h-3" />}
      {t === "neutral" && <Minus className="w-3 h-3" />}
      {diff > 0 ? `+${diff}` : diff} vs yesterday
    </span>
  );
}

const CARDS = [
  { key: "totalAppointments", label: "Appointments Today", icon: CalendarCheck, color: "text-primary bg-primary/10" },
  { key: "completed", label: "Vaccinations Done", icon: Syringe, color: "text-accent bg-accent-subtle" },
  { key: "walkins", label: "Walk-ins Handled", icon: UserPlus, color: "text-warning bg-warning-subtle" },
  { key: "slotsRemaining", label: "Slots Remaining", icon: LayoutGrid, color: "text-navy-500 bg-navy-100" },
] as const;

export function KPIRow(props: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map(({ key, label, icon: Icon, color }, i) => {
        const kpi = props[key];
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07, ease: "easeOut" }}
            className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">{label}</span>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{kpi.today}</p>
            <TrendBadge today={kpi.today} yesterday={kpi.yesterday} />
          </motion.div>
        );
      })}
    </div>
  );
}
