"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import { UserCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  lastLogin: string;
  shiftEnd: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function shiftEndLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });
}

export function StaffOnShift() {
  const { data, isLoading } = useSWR<{ staff: StaffMember[] }>(
    "/api/worker/staff-on-shift",
    fetcher,
    { refreshInterval: 60_000 }
  );

  const staff = data?.staff ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25 }}
      className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Staff On Shift</h2>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent-subtle text-accent-foreground">
          {staff.length} active
        </span>
      </div>

      <div className="divide-y divide-border">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-2.5 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No staff currently on shift</p>
        ) : (
          staff.map((member) => (
            <div key={member.id} className="flex items-center gap-3 px-5 py-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                member.role === "center_manager" ? "bg-primary/10 text-primary" : "bg-accent-subtle text-accent-foreground"
              )}>
                {initials(member.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{member.role.replace("_", " ")}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock className="w-3 h-3" />
                <span>Until {shiftEndLabel(member.shiftEnd)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
