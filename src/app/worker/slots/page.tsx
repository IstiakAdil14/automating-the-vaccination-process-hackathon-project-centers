"use client";

import { useState, useCallback } from "react";
import { CalendarDays, Ban, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SlotCalendar } from "@/components/features/slots/SlotCalendar";
import { SlotDrawer } from "@/components/features/slots/SlotDrawer";
import { BlockDatesDialog } from "@/components/features/slots/BlockDatesDialog";
import { BulkApplyDialog } from "@/components/features/slots/BulkApplyDialog";
import { useSlots } from "@/hooks/useSlots";
import type { SlotConfigDTO } from "@/types";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function WorkerSlotsPage() {
  const [month, setMonth] = useState(currentMonth);
  const { slots, isLoading, upsertSlot, blockDates, unblockDates } = useSlots(month);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkConfig, setBulkConfig] = useState<Omit<
    SlotConfigDTO,
    "id" | "booked" | "isBlocked" | "blockId" | "blockReason"
  > | null>(null);
  const [bulkSourceDate, setBulkSourceDate] = useState("");

  const slotMap = Object.fromEntries(slots.map((s) => [s.date, s]));
  const existing = selectedDate ? (slotMap[selectedDate] ?? null) : null;

  const handleSave = useCallback(
    async (
      payload: Omit<SlotConfigDTO, "id" | "booked" | "isBlocked" | "blockId" | "blockReason">
    ) => {
      await upsertSlot(payload);
    },
    [upsertSlot]
  );

  const handleBulkApply = useCallback(
    async (
      config: Omit<SlotConfigDTO, "id" | "booked" | "isBlocked" | "blockId" | "blockReason">,
      days: number
    ) => {
      const today = new Date().toISOString().slice(0, 10);
      const start = new Date(config.date + "T00:00:00");
      start.setDate(start.getDate() + 1); // start from day after source

      const saves: Promise<void>[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        if (dateStr <= today) continue;
        // Skip already-blocked dates
        if (slotMap[dateStr]?.isBlocked) continue;
        saves.push(upsertSlot({ ...config, date: dateStr }));
      }
      await Promise.all(saves);
    },
    [upsertSlot, slotMap]
  );

  function openBulkFromSelected() {
    if (!selectedDate || !existing || existing.isBlocked) return;
    setBulkSourceDate(selectedDate);
    setBulkConfig({
      date: selectedDate,
      totalCapacity: existing.totalCapacity,
      morningLimit: existing.morningLimit,
      eveningLimit: existing.eveningLimit,
      walkinQuota: existing.walkinQuota,
      vaccineAllocations: existing.vaccineAllocations,
    });
    setSelectedDate(null);
    setBulkOpen(true);
  }

  const today = new Date().toISOString().slice(0, 10);
  const selectedIsPast = !!selectedDate && selectedDate < today;
  const selectedIsBlocked = existing?.isBlocked ?? false;
  const canBulk = !!selectedDate && !selectedIsPast && !selectedIsBlocked && !!existing;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Slot Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure daily vaccination capacity, vaccine allocations, and blocked dates
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canBulk && (
            <Button variant="outline" size="sm" onClick={openBulkFromSelected}>
              <Copy className="w-4 h-4" />
              Bulk apply
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBlockOpen(true)}
            className="border-danger/40 text-danger hover:bg-danger/10"
          >
            <Ban className="w-4 h-4" />
            Block dates
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Configured days",
              value: slots.filter((s) => !s.isBlocked).length,
              color: "text-primary",
            },
            {
              label: "Blocked days",
              value: slots.filter((s) => s.isBlocked).length,
              color: "text-danger",
            },
            {
              label: "Total capacity",
              value: slots.filter((s) => !s.isBlocked).reduce((s, c) => s + c.totalCapacity, 0),
              color: "text-accent",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <SlotCalendar
          month={month}
          slots={slots}
          onMonthChange={setMonth}
          onDayClick={setSelectedDate}
        />
      )}

      {/* Slide-over drawer */}
      <SlotDrawer
        date={selectedDate}
        existing={existing}
        onClose={() => setSelectedDate(null)}
        onSave={handleSave}
        onUnblock={unblockDates}
      />

      {/* Block dates dialog */}
      <BlockDatesDialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        onBlock={async (s, e, r) => { await blockDates(s, e, r); }}
      />

      {/* Bulk apply dialog */}
      <BulkApplyDialog
        open={bulkOpen}
        sourceDate={bulkSourceDate}
        config={bulkConfig}
        onClose={() => setBulkOpen(false)}
        onApply={handleBulkApply}
      />
    </div>
  );
}
