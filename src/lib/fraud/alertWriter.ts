// lib/fraud/alertWriter.ts
// Writes FraudAlert documents for any failed detector checks.
// Also maintains an in-process SSE client registry so the fraud/stream route
// can push new alerts to connected dashboards in real time.
//
// IMPORTANT: This module runs server-side only. Never import in client components.

import mongoose from "mongoose";
import { FraudAlert } from "@/lib/db";
import type { CheckResult } from "./detector";
import type { FraudAlertType, FraudSeverity } from "@/lib/constants";

// ── SSE client registry ───────────────────────────────────────────────────────
// Maps centerId → Set of send functions (one per connected browser tab).

type SendFn = (data: string) => void;
const sseClients = new Map<string, Set<SendFn>>();

export function registerSseClient(centerId: string, send: SendFn): () => void {
  if (!sseClients.has(centerId)) sseClients.set(centerId, new Set());
  sseClients.get(centerId)!.add(send);
  // Return unregister function
  return () => {
    sseClients.get(centerId)?.delete(send);
    if (sseClients.get(centerId)?.size === 0) sseClients.delete(centerId);
  };
}

function pushToClients(centerId: string, payload: object) {
  const clients = sseClients.get(centerId);
  if (!clients || clients.size === 0) return;
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((send) => { try { send(msg); } catch { /* client disconnected */ } });
}

// ── Check → FraudAlert type mapping ──────────────────────────────────────────

const CHECK_TO_ALERT_TYPE: Record<string, FraudAlertType> = {
  duplicate_dose:           "duplicate_record",
  same_day_multi_location:  "duplicate_record",
  qr_signature:             "qr_tamper",
  nid_format:               "identity_mismatch",
  batch_integrity:          "suspicious_volume",
  staff_velocity:           "suspicious_volume",
  excess_doses:             "excess_doses",
};

const SEVERITY_MAP: Record<string, FraudSeverity> = {
  block: "high",
  warn:  "medium",
  info:  "low",
};

// ── Write alerts for all failed checks ───────────────────────────────────────

export async function writeFailedChecks(
  centerId: string,
  staffId:  string,
  patientNid: string,
  results:  CheckResult[]
): Promise<void> {
  const failed = results.filter((r) => !r.passed);
  if (failed.length === 0) return;

  const centerObjId = new mongoose.Types.ObjectId(centerId);
  const staffObjId  = new mongoose.Types.ObjectId(staffId);

  await Promise.all(
    failed.map(async (result) => {
      const alertType = CHECK_TO_ALERT_TYPE[result.checkName] ?? "suspicious_volume";
      const severity  = SEVERITY_MAP[result.severity] ?? "medium";

      const alert = await FraudAlert.create({
        centerId:   centerObjId,
        type:       alertType,
        staffId:    staffObjId,
        patientNid: patientNid || undefined,
        severity,
        status:     "open",
        context: {
          checkName: result.checkName,
          message:   result.message,
          ...(result.alertData ?? {}),
        },
      });

      // Push SSE event to all connected dashboard clients for this center
      pushToClients(centerId, {
        type:  "new_alert",
        alert: {
          id:         String(alert._id),
          type:       alertType,
          severity,
          patientNid: patientNid
            ? patientNid.slice(0, 3) + "****" + patientNid.slice(-2)
            : null,
          context:    alert.context,
          createdAt:  alert.createdAt.toISOString(),
        },
      });
    })
  );
}
