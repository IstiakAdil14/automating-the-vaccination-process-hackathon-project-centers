"use client";

import { useState } from "react";
import { BarChart2, Users, AlertCircle, Download, FileText } from "lucide-react";
import { VaccinationChart } from "./VaccinationChart";
import { StaffPerformanceTable } from "./StaffPerformanceTable";
import { SideEffectReports } from "./SideEffectReports";
import { cn } from "@/lib/utils/cn";

type Tab = "vaccinations" | "staff" | "sideeffects";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "vaccinations", label: "Vaccinations",    icon: BarChart2 },
  { id: "staff",        label: "Staff Performance", icon: Users },
  { id: "sideeffects",  label: "Side Effects",    icon: AlertCircle },
];

export function ReportsClient() {
  const [tab, setTab] = useState<Tab>("vaccinations");

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to   = now.toISOString().slice(0, 10);

  function openPdf(type: string) {
    window.open(`/api/worker/reports/export.pdf?from=${from}&to=${to}&type=${type}`, "_blank");
  }

  function openCsv() {
    window.open(`/api/worker/audit/log/export.csv`, "_blank");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vaccination analytics, staff performance, and side effect monitoring
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openPdf(tab)}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <button
            onClick={openCsv}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 py-2.5 px-4 text-sm font-medium border-b-2 transition-colors",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "vaccinations" && <VaccinationChart />}
      {tab === "staff"        && <StaffPerformanceTable />}
      {tab === "sideeffects"  && <SideEffectReports />}
    </div>
  );
}
