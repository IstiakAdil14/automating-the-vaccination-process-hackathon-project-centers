"use client";

import { CheckCircle2, Clock, AlertCircle, User } from "lucide-react";
import { VACCINE_MAX_DOSES } from "@/lib/constants";
import type { VaccineType } from "@/lib/constants";
import type { PatientData, PatientHistory } from "@/hooks/useRecordVaccination";
import { cn } from "@/lib/utils/cn";

interface Props {
  patient: PatientData;
  history: PatientHistory[];
  expectedVaccineType?: string | null;
  expectedDose?: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-BD", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatAge(dob: string | null) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return `${years} yrs`;
}

function groupByVaccine(history: PatientHistory[]) {
  const map = new Map<string, PatientHistory[]>();
  for (const h of history) {
    const arr = map.get(h.vaccineType) ?? [];
    arr.push(h);
    map.set(h.vaccineType, arr);
  }
  return map;
}

const SITE_LABELS: Record<string, string> = {
  left_arm: "Left Arm", right_arm: "Right Arm",
  left_thigh: "Left Thigh", right_thigh: "Right Thigh", oral: "Oral",
};

export function PatientCard({ patient, history, expectedVaccineType, expectedDose }: Props) {
  const grouped = groupByVaccine(history);

  return (
    <div className="space-y-4">
      {/* Patient info */}
      <div className="flex items-start gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <User className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground text-base">{patient.name}</h3>
            {!patient.isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-danger-subtle text-danger-foreground font-medium">
                Suspended
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
            {patient.nid && <span>NID: {patient.nid}</span>}
            {patient.dob && <span>DOB: {formatDate(patient.dob)} ({formatAge(patient.dob)})</span>}
            {patient.phone && <span>📞 {patient.phone}</span>}
          </div>
        </div>
      </div>

      {/* Vaccination history */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Vaccination History</h4>

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No prior vaccinations on record.</p>
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([vaccineType, doses]) => {
              const maxDoses = VACCINE_MAX_DOSES[vaccineType as VaccineType] ?? 1;
              const isCurrentVaccine = vaccineType === expectedVaccineType;

              return (
                <div key={vaccineType} className="rounded-xl border border-border overflow-hidden">
                  {/* Vaccine header */}
                  <div className={cn(
                    "flex items-center justify-between px-4 py-2.5",
                    isCurrentVaccine ? "bg-primary/10" : "bg-surface-raised"
                  )}>
                    <span className="font-medium text-sm text-foreground">{vaccineType}</span>
                    <span className="text-xs text-muted-foreground">
                      {doses.length} / {maxDoses} dose{maxDoses !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Dose timeline */}
                  <div className="px-4 py-3 space-y-2">
                    {Array.from({ length: maxDoses }, (_, i) => {
                      const doseNum = i + 1;
                      const record = doses.find((d) => d.doseNumber === doseNum);
                      const isCurrent = isCurrentVaccine && doseNum === expectedDose;

                      return (
                        <div
                          key={doseNum}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                            isCurrent && "bg-warning-subtle border border-warning/30",
                            record && !isCurrent && "bg-accent-subtle"
                          )}
                        >
                          {record ? (
                            <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                          ) : isCurrent ? (
                            <AlertCircle className="w-4 h-4 text-warning shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}

                          <span className={cn(
                            "font-medium",
                            record ? "text-accent-foreground" : isCurrent ? "text-warning-foreground" : "text-muted-foreground"
                          )}>
                            Dose {doseNum}
                          </span>

                          {record ? (
                            <span className="text-muted-foreground ml-auto">
                              {formatDate(record.date)} · {SITE_LABELS[record.adminSite] ?? record.adminSite}
                            </span>
                          ) : isCurrent ? (
                            <span className="ml-auto text-warning-foreground font-medium text-xs uppercase tracking-wide">
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
    </div>
  );
}
