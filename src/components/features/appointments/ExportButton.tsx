"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Filters } from "./AppointmentsClient";

interface Props { filters: Filters; }

export function ExportButton({ filters }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    const params = new URLSearchParams({ date: filters.date });
    if (filters.status) params.set("status", filters.status);
    if (filters.shift) params.set("shift", filters.shift);
    filters.vaccineTypes.forEach((v) => params.append("vaccineType", v));

    const res = await fetch(`/api/worker/appointments/export.csv?${params}`);
    if (!res.ok) { setLoading(false); return; }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${filters.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} loading={loading}>
      <Download className="w-4 h-4" />
      Export CSV
    </Button>
  );
}
