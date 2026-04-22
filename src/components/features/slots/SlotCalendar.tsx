"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SlotConfigDTO } from "@/types";

interface Props {
  month: string; // "YYYY-MM"
  slots: SlotConfigDTO[];
  onMonthChange: (month: string) => void;
  onDayClick: (date: string) => void;
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array<null>(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return [...blanks, ...days];
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function SlotCalendar({ month, slots, onMonthChange, onDayClick }: Props) {
  const [year, mon] = month.split("-").map(Number);
  const today = new Date().toISOString().slice(0, 10);

  const slotMap = useMemo(() => {
    const m: Record<string, SlotConfigDTO> = {};
    for (const s of slots) m[s.date] = s;
    return m;
  }, [slots]);

  const days = useMemo(() => buildCalendarDays(year, mon - 1), [year, mon]);

  function changeMonth(delta: number) {
    const d = new Date(year, mon - 1 + delta, 1);
    onMonthChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }

  const monthLabel = new Date(year, mon - 1, 1).toLocaleDateString("en-BD", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => changeMonth(-1)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-foreground">{monthLabel}</span>
        <button
          onClick={() => changeMonth(1)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={`blank-${idx}`} />;

          const dateStr = `${year}-${pad(mon)}-${pad(day)}`;
          const slot = slotMap[dateStr];
          const isPast = dateStr < today;
          const isToday = dateStr === today;
          const isBlocked = slot?.isBlocked;
          const hasConfig = !!slot && !isBlocked;
          const booked = slot?.booked ?? 0;
          const capacity = slot?.totalCapacity ?? 0;
          const fillPct = capacity > 0 ? booked / capacity : 0;
          const isFull = hasConfig && booked >= capacity;

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              disabled={isPast}
              className={cn(
                "relative flex flex-col items-center justify-start rounded-lg p-1.5 min-h-[56px] text-xs transition-colors border",
                isPast
                  ? "opacity-40 cursor-not-allowed border-transparent bg-muted/30"
                  : isBlocked
                  ? "bg-danger/10 border-danger/40 hover:bg-danger/20 cursor-pointer"
                  : "border-border hover:bg-muted cursor-pointer",
                isToday && !isBlocked && "border-primary ring-1 ring-primary"
              )}
            >
              <span
                className={cn(
                  "font-medium",
                  isToday ? "text-primary" : "text-foreground",
                  isBlocked && "text-danger"
                )}
              >
                {day}
              </span>

              {isBlocked && (
                <Lock className="w-3 h-3 text-danger mt-0.5" />
              )}

              {hasConfig && (
                <>
                  {/* Fill bar */}
                  <div className="w-full mt-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isFull ? "bg-danger" : fillPct > 0.8 ? "bg-warning" : "bg-accent"
                      )}
                      style={{ width: `${Math.min(fillPct * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground mt-0.5 leading-none">
                    {booked}/{capacity}
                  </span>
                </>
              )}

              {!hasConfig && !isBlocked && !isPast && (
                <span className="text-muted-foreground/60 mt-1">—</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" /> &gt;80% full
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> Full / Blocked
        </span>
      </div>
    </div>
  );
}
