"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import type { Filters } from "./AppointmentsClient";

const STATUSES = ["pending", "confirmed", "completed", "no_show", "cancelled", "rescheduled"];
const SHIFTS = [{ value: "morning", label: "Morning (before 14:00)" }, { value: "evening", label: "Evening (14:00+)" }];

interface Props {
  filters: Filters;
  vaccineTypes: string[];
  total: number;
  loading: boolean;
  onChange: (f: Filters) => void;
}

export function FilterBar({ filters, vaccineTypes, total, loading, onChange }: Props) {
  const [q, setQ] = useState(filters.q);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => onChange({ ...filters, q }), 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof Filters>(key: K, val: Filters[K]) {
    onChange({ ...filters, [key]: val });
  }

  function toggleVaccine(v: string) {
    const next = filters.vaccineTypes.includes(v)
      ? filters.vaccineTypes.filter((x) => x !== v)
      : [...filters.vaccineTypes, v];
    set("vaccineTypes", next);
  }

  const hasActiveFilters =
    filters.status || filters.vaccineTypes.length || filters.shift || filters.q;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date */}
        <Input
          type="date"
          value={filters.date}
          onChange={(e) => set("date", e.target.value)}
          className="h-9 w-40 text-sm"
        />

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Booking ID or NID last 4 digits"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>

        {/* Shift */}
        <select
          value={filters.shift}
          onChange={(e) => set("shift", e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All shifts</option>
          {SHIFTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={() => { setQ(""); onChange({ date: filters.date, status: "", vaccineTypes: [], shift: "", q: "" }); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? "Loading…" : `${total} appointment${total !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Vaccine type multi-select chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground shrink-0">Vaccine:</span>
        {vaccineTypes.map((v) => (
          <button
            key={v}
            onClick={() => toggleVaccine(v)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              filters.vaccineTypes.includes(v)
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
