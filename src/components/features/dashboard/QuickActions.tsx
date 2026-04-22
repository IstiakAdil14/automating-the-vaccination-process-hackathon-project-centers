"use client";

import { motion } from "framer-motion";
import { UserPlus, Syringe, Hash, CalendarDays } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const ACTIONS = [
  {
    label: "Check In Walk-in",
    description: "Register a new walk-in patient",
    icon: UserPlus,
    href: "/queue?action=walkin",
    color: "bg-primary/10 text-primary hover:bg-primary/20",
    border: "border-primary/20",
  },
  {
    label: "Record Vaccination",
    description: "Log a completed vaccination",
    icon: Syringe,
    href: "/vaccinations?action=record",
    color: "bg-accent-subtle text-accent-foreground hover:bg-accent/20",
    border: "border-accent/20",
  },
  {
    label: "Generate Token",
    description: "Issue a queue token",
    icon: Hash,
    href: "/queue?action=token",
    color: "bg-warning-subtle text-warning-foreground hover:bg-warning/20",
    border: "border-warning/20",
  },
  {
    label: "Today's Appointments",
    description: "View the full schedule",
    icon: CalendarDays,
    href: "/appointments",
    color: "bg-navy-100 text-navy-700 hover:bg-navy-200",
    border: "border-navy-200",
  },
] as const;

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-3"
    >
      <h2 className="font-semibold text-foreground text-sm">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ label, description, icon: Icon, href, color, border }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Link
              href={href}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                color,
                border
              )}
            >
              <Icon className="w-5 h-5" aria-hidden />
              <div>
                <p className="text-sm font-semibold leading-tight">{label}</p>
                <p className="text-xs opacity-70 mt-0.5">{description}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
