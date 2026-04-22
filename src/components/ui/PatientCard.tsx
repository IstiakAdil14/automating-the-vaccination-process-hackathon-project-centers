"use client";

import { User, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface VaccinationHistoryEntry {
  vaccineType: string;
  doseNumber: number;
  date: string;
  adminSite?: string;
  batchNo?: string;
}

export interface PatientCardProps {
  /** Masked patient name (e.g. "**hmed A**") */
  name: string;
  /** Last 4 digits of NID */
  nidLast4?: string;
  /** Full NID — shown only if explicitly provided (staff view) */
  nidFull?: string;
  dob?: string | null;
  phone?: string;
  isActive?: boolean;
  /** Vaccination history summary */
  history?: VaccinationHistoryEntry[];
  /** Max doses per vaccine type for progress display */
  maxDoses?: Record<string, number>;
  /** Highlight this vaccine type as "current" */
  currentVaccineType?: string;
  currentDose?: number;
  /** Show a compact single-line summary instead of full history */
  compact?: boolean;
  className?: string;
}

const SITE_LABELS: Record<string, string> = {
  left_arm: "L. Arm", right_arm: "R. Arm",
  left_thigh: "L. Thigh", right_thigh: "R. Thigh", oral: "Oral",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatAge(dob: string) {
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  return `${years} yrs`;
}

export function PatientCard({
  name,
  nidLast4,
  nidFull,
  dob,
  phone,
  isActive = true,
  history = [],
  maxDoses = {},
  currentVaccineType,
  currentDose,
  compact = false,
  className,
}: PatientCardProps) {
  // Group history by vaccine type
  const grouped = history.reduce<Record<string, VaccinationHistoryEntry[]>>((acc, h) => {
    (acc[h.vaccineType] ??= []).push(h);
    return acc;
  }, {});

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Identity card ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border shadow-sm">
        {/* Avatar placeholder */}
        <div
          className="w-12 h-12 rounded-full bg-primary-50 text-primary flex items-center justify-center shrink-0"
          aria-hidden
        >
          <User className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground text-base">{name}</h3>
            {!isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-danger-subtle text-danger-foreground font-medium">
                Suspended
              </span>
            )}
          </div>

          <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
            {(nidFull || nidLast4) && (
              <div className="flex gap-1">
                <dt className="sr-only">NID</dt>
                <dd>NID: {nidFull ? nidFull : `···${nidLast4}`}</dd>
              </div>
            )}
            {dob && (
              <div className="flex gap-1">
                <dt className="sr-only">Date of birth</dt>
                <dd>DOB: {formatDate(dob)} ({formatAge(dob)})</dd>
              </div>
            )}
            {phone && (
              <div className="flex gap-1">
                <dt className="sr-only">Phone</dt>
                <dd>{phone}</dd>
              </div>
            )}
          </dl>

          {/* Compact history summary */}
          {compact && history.length > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {history.length} vaccination{history.length !== 1 ? "s" : ""} on record
              {currentVaccineType && ` · ${currentVaccineType} Dose ${currentDose ?? "?"} due`}
            </p>
          )}
        </div>
      </div>

      {/* ── Vaccination history ────────────────────────────────────────────── */}
      {!compact && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Vaccination History</h4>

          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No prior vaccinations on record.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([vaccineType, doses]) => {
                const max = maxDoses[vaccineType] ?? 1;
                const isCurrent = vaccineType === currentVaccineType;

                return (
                  <div key={vaccineType} className="rounded-xl border border-border overflow-hidden">
                    {/* Vaccine header */}
                    <div
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5",
                        isCurrent ? "bg-primary-50" : "bg-muted/30"
                      )}
                    >
                      <span className="font-medium text-sm text-foreground">{vaccineType}</span>
                      <span className="text-xs text-muted-foreground">
                        {doses.length}/{max} dose{max !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Dose timeline */}
                    <div className="px-4 py-3 space-y-2">
                      {Array.from({ length: max }, (_, i) => {
                        const doseNum = i + 1;
                        const record = doses.find((d) => d.doseNumber === doseNum);
                        const isDue = isCurrent && doseNum === currentDose;

                        return (
                          <div
                            key={doseNum}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                              isDue && "bg-warning-subtle border border-warning/30",
                              record && !isDue && "bg-success-subtle"
                            )}
                          >
                            {record ? (
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden />
                            ) : isDue ? (
                              <AlertCircle className="w-4 h-4 text-warning shrink-0" aria-hidden />
                            ) : (
                              <Clock className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                            )}

                            <span
                              className={cn(
                                "font-medium",
                                record ? "text-success-foreground"
                                  : isDue ? "text-warning-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              Dose {doseNum}
                            </span>

                            {record ? (
                              <span className="text-muted-foreground ml-auto text-xs">
                                {formatDate(record.date)}
                                {record.adminSite && ` · ${SITE_LABELS[record.adminSite] ?? record.adminSite}`}
                              </span>
                            ) : isDue ? (
                              <span className="ml-auto text-warning-foreground font-semibold text-xs uppercase tracking-wide">
                                Due now
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
