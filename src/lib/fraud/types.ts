// lib/fraud/types.ts
// Shared types for the fraud detection engine.
// Imported by detector.ts, alertWriter.ts, and unit tests.

import type { VaccineType } from "@/lib/constants";

// ── Per-check result ──────────────────────────────────────────────────────────

export type CheckSeverity = "block" | "warn" | "info";

export interface CheckResult {
  checkName:  string;
  passed:     boolean;
  severity:   CheckSeverity;
  message:    string;
  alertData?: Record<string, unknown>; // evidence payload written to FraudAlerts
}

// ── Input to runAllChecks ─────────────────────────────────────────────────────

export interface CheckInput {
  userId:      string;
  centerId:    string;
  staffId:     string;
  vaccineType: VaccineType;
  doseNumber:  number;
  batchNo:     string;
  nid:         string;
  qrPayload?:  string; // raw QR string: "VCBD:<userId>:<vaccineType>:<doseNumber>:<hmac>"
}

// ── Aggregate output ──────────────────────────────────────────────────────────

export interface DetectorOutput {
  /** false if ANY check has severity="block" and passed=false */
  passed:               boolean;
  /** true if ANY check has severity="warn" and passed=false */
  requiresConfirmation: boolean;
  results:              CheckResult[];
}
