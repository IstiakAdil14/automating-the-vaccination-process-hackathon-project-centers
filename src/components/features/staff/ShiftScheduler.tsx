"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { StaffRow } from "./StaffClient";

const SHIFTS = ["morning", "afternoon"] as const;
const SHIFT_LABEL: Record<string, string> = { morning: "M", afternoon: "E" };
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  staff: StaffRow[];
  weekDates: string[];
  onShiftChange: (staffId: string, date: string, shift: string, action: "assign" | "remove") => Promise<void>;
}

export function ShiftScheduler({ staff, weekDates, onShiftChange }: Props) {
  const [pending, setPending] = useState<string | null>(null); // "staffId-date-shift"

  async function toggleShift(staffId: string, date: string, shift: string, currentShifts: string[]) {
    const key = `${staffId}-${date}-${shift}`;
    if (pending === key) return;
    setPending(key);
    const action = currentShifts.includes(shift) ? "remove" : "assign";
    try {
      await onShiftChange(staffId, date, shift, action);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Shift Scheduler — This Week</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Click M (morning) or E (evening) to assign/remove shifts</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-40">
                Staff
              </th>
              {weekDates.map((date, i) => (
                <th key={date} className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[72px]">
                  <div>{DAY_LABELS[i]}</div>
                  <div className="font-normal text-muted-foreground/60">{date.slice(5)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-border/50 last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-foreground text-xs truncate max-w-[140px]">{s.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.role === "center_manager" ? "Manager" : "Staff"}</p>
                </td>
                {weekDates.map((date) => {
                  const dayShifts = s.weekShifts[date] ?? [];
                  return (
                    <td key={date} className="px-2 py-2.5">
                      <div className="flex gap-1 justify-center">
                        {SHIFTS.map((shift) => {
                          const active = dayShifts.includes(shift);
                          const key = `${s.id}-${date}-${shift}`;
                          const isLoading = pending === key;
                          return (
                            <button
                              key={shift}
                              onClick={() => toggleShift(s.id, date, shift, dayShifts)}
                              disabled={isLoading}
                              title={shift}
                              className={cn(
                                "w-7 h-7 rounded text-xs font-bold transition-all",
                                active
                                  ? shift === "morning"
                                    ? "bg-primary text-white"
                                    : "bg-accent text-white"
                                  : "bg-muted/40 text-muted-foreground hover:bg-muted",
                                isLoading && "opacity-50 cursor-wait"
                              )}
                            >
                              {isLoading ? "·" : SHIFT_LABEL[shift]}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-primary text-white text-xs font-bold flex items-center justify-center">M</span>
          Morning (08:00–14:00)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-accent text-white text-xs font-bold flex items-center justify-center">E</span>
          Evening (14:00–20:00)
        </span>
      </div>
    </div>
  );
}
