"use client";

import { useState } from "react";
import { ShieldAlert, ClipboardList, GitMerge } from "lucide-react";
import { FraudAlertList, type FraudAlertRow } from "./FraudAlertList";
import { AlertInvestigationDrawer } from "./AlertInvestigationDrawer";
import { ActivityLog } from "./ActivityLog";
import { SyncConflictLog } from "./SyncConflictLog";
import { cn } from "@/lib/utils/cn";

type Tab = "fraud" | "activity" | "sync";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "fraud",    label: "Fraud Alerts",  icon: ShieldAlert },
  { id: "activity", label: "Activity Log",  icon: ClipboardList },
  { id: "sync",     label: "Sync Conflicts", icon: GitMerge },
];

export function AuditClient() {
  const [tab, setTab] = useState<Tab>("fraud");
  const [investigatingAlert, setInvestigatingAlert] = useState<FraudAlertRow | null>(null);

  function handleResolved(id: string, newStatus: string) {
    // The FraudAlertList will re-fetch on next filter change;
    // for now just close the drawer — the list will reflect on next refresh
    console.log("Alert", id, "→", newStatus);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-danger" />
          Security & Audit
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Fraud monitoring, complete activity log, and offline sync conflict resolution
        </p>
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

      {/* Tab panels */}
      {tab === "fraud" && (
        <FraudAlertList onInvestigate={setInvestigatingAlert} />
      )}
      {tab === "activity" && <ActivityLog />}
      {tab === "sync" && <SyncConflictLog />}

      {/* Investigation drawer */}
      <AlertInvestigationDrawer
        alert={investigatingAlert}
        onClose={() => setInvestigatingAlert(null)}
        onResolved={handleResolved}
      />
    </div>
  );
}
