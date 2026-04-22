// lib/fraud/detector.ts
// Six fraud checks run before every vaccination record is saved.
// DB queries are injected as async functions so unit tests can mock them cleanly.
// Each check returns CheckResult. runAllChecks aggregates into DetectorOutput.

import crypto from "crypto";
import type { VaccineType } from "@/lib/constants";
import { VACCINE_MAX_DOSES } from "@/lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckSeverity = "block" | "warn" | "info";

export interface CheckResult {
  checkName:  string;
  passed:     boolean;
  severity:   CheckSeverity;
  message:    string;
  alertData?: Record<string, unknown>;
}

export interface CheckInput {
  userId:      string;
  centerId:    string;
  staffId:     string;
  vaccineType: VaccineType;
  doseNumber:  number;
  batchNo:     string;
  nid:         string;
  qrPayload?:  string; // "VCBD:<userId>:<vaccineType>:<doseNumber>:<hmac>"
}

export interface DetectorOutput {
  passed:               boolean; // false if any block-severity check failed
  requiresConfirmation: boolean; // true if any warn-severity check failed
  results:              CheckResult[];
}

// ── DB dependency interfaces (injected — never imported directly in tests) ────

export interface DuplicateDoseQuery {
  (userId: string, vaccineType: string, doseNumber: number): Promise<boolean>;
}
export interface SameDayElsewhereQuery {
  (userId: string, centerId: string, todayStart: Date, todayEnd: Date): Promise<{ centerId: string } | null>;
}
export interface BatchExistsQuery {
  (centerId: string, batchNo: string): Promise<boolean>;
}
export interface StaffVelocityQuery {
  (staffId: string, since: Date): Promise<number>;
}

// ── 1. Duplicate dose check ───────────────────────────────────────────────────

export async function checkDuplicateDose(
  input: Pick<CheckInput, "userId" | "vaccineType" | "doseNumber">,
  query: DuplicateDoseQuery
): Promise<CheckResult> {
  const exists = await query(input.userId, input.vaccineType, input.doseNumber);
  if (exists) {
    return {
      checkName: "duplicate_dose",
      passed:    false,
      severity:  "block",
      message:   `Duplicate dose detected: ${input.vaccineType} dose ${input.doseNumber} already recorded for this patient.`,
      alertData: { userId: input.userId, vaccineType: input.vaccineType, doseNumber: input.doseNumber },
    };
  }
  return { checkName: "duplicate_dose", passed: true, severity: "block", message: "No duplicate dose found." };
}

// ── 2. Same-day multi-location check ─────────────────────────────────────────

export async function checkSameDayMultiLocation(
  input: Pick<CheckInput, "userId" | "centerId">,
  query: SameDayElsewhereQuery,
  now = new Date()
): Promise<CheckResult> {
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const record = await query(input.userId, input.centerId, todayStart, todayEnd);
  if (record) {
    return {
      checkName: "same_day_multi_location",
      passed:    false,
      severity:  "warn",
      message:   "Patient was vaccinated at a different center today. Confirm this is intentional.",
      alertData: { userId: input.userId, otherCenterId: record.centerId },
    };
  }
  return { checkName: "same_day_multi_location", passed: true, severity: "warn", message: "No same-day multi-location conflict." };
}

// ── 3. QR signature check ─────────────────────────────────────────────────────
// QR format: "VCBD:<userId>:<vaccineType>:<doseNumber>:<hmacHex>"
// HMAC-SHA256 over "VCBD:<userId>:<vaccineType>:<doseNumber>" using QR_SECRET env var.

export function checkQrSignature(
  input: Pick<CheckInput, "userId" | "vaccineType" | "doseNumber" | "qrPayload">
): CheckResult {
  if (!input.qrPayload) {
    // No QR presented — not a QR-based check-in, skip
    return { checkName: "qr_signature", passed: true, severity: "block", message: "No QR payload — skipped." };
  }

  const parts = input.qrPayload.split(":");
  // Expected: VCBD : userId : vaccineType : doseNumber : hmac
  if (parts.length < 5 || parts[0] !== "VCBD") {
    return {
      checkName: "qr_signature",
      passed:    false,
      severity:  "block",
      message:   "Tampered QR code: invalid format.",
      alertData: { qrPayload: input.qrPayload },
    };
  }

  const [, qrUserId, qrVaccineType, qrDoseStr, providedHmac] = parts;
  const qrDose = parseInt(qrDoseStr, 10);

  // Verify payload fields match the form submission
  if (
    qrUserId      !== input.userId ||
    qrVaccineType !== input.vaccineType ||
    qrDose        !== input.doseNumber
  ) {
    return {
      checkName: "qr_signature",
      passed:    false,
      severity:  "block",
      message:   "Tampered QR code: payload fields do not match submitted data.",
      alertData: { qrUserId, qrVaccineType, qrDose, submitted: { userId: input.userId, vaccineType: input.vaccineType, doseNumber: input.doseNumber } },
    };
  }

  // Verify HMAC
  const secret = process.env.QR_HMAC_SECRET ?? "vcbd-dev-secret";
  const data   = `VCBD:${qrUserId}:${qrVaccineType}:${qrDoseStr}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(providedHmac, "hex"), Buffer.from(expected, "hex"))) {
    return {
      checkName: "qr_signature",
      passed:    false,
      severity:  "block",
      message:   "Tampered QR code: HMAC signature mismatch.",
      alertData: { qrPayload: input.qrPayload },
    };
  }

  return { checkName: "qr_signature", passed: true, severity: "block", message: "QR signature valid." };
}

// ── 4. NID format validation ──────────────────────────────────────────────────
// Bangladesh NID: 10 digits (old) or 17 digits (new smart card).
// 17-digit: first 4 = birth year (1900–2099), digits 5–8 = district+upazila code.
// 10-digit: derived from 17-digit by taking last 10 digits.

export function checkNidFormat(input: Pick<CheckInput, "nid">): CheckResult {
  const { nid } = input;

  if (!nid || nid.trim() === "") {
    // NID not on file — warn but don't block (some citizens use birth cert)
    return { checkName: "nid_format", passed: true, severity: "info", message: "No NID on file — skipped." };
  }

  const digits = nid.replace(/\s/g, "");

  if (!/^\d{10}$|^\d{17}$/.test(digits)) {
    return {
      checkName: "nid_format",
      passed:    false,
      severity:  "warn",
      message:   `Invalid NID format: expected 10 or 17 digits, got ${digits.length}.`,
      alertData: { nidLength: digits.length },
    };
  }

  if (digits.length === 17) {
    const birthYear = parseInt(digits.slice(0, 4), 10);
    if (birthYear < 1900 || birthYear > new Date().getFullYear()) {
      return {
        checkName: "nid_format",
        passed:    false,
        severity:  "warn",
        message:   `Invalid NID: birth year ${birthYear} is out of range.`,
        alertData: { birthYear },
      };
    }
    // District code (digits 5–6) must be 01–64 (Bangladesh has 64 districts)
    const districtCode = parseInt(digits.slice(4, 6), 10);
    if (districtCode < 1 || districtCode > 64) {
      return {
        checkName: "nid_format",
        passed:    false,
        severity:  "warn",
        message:   `Invalid NID: district code ${districtCode} is out of range (01–64).`,
        alertData: { districtCode },
      };
    }
  }

  return { checkName: "nid_format", passed: true, severity: "warn", message: "NID format valid." };
}

// ── 5. Batch integrity check ──────────────────────────────────────────────────

export async function checkBatchIntegrity(
  input: Pick<CheckInput, "centerId" | "batchNo">,
  query: BatchExistsQuery
): Promise<CheckResult> {
  const exists = await query(input.centerId, input.batchNo);
  if (!exists) {
    return {
      checkName: "batch_integrity",
      passed:    false,
      severity:  "warn",
      message:   `Unknown batch number "${input.batchNo}" — not found in this center's inventory.`,
      alertData: { centerId: input.centerId, batchNo: input.batchNo },
    };
  }
  return { checkName: "batch_integrity", passed: true, severity: "warn", message: "Batch found in inventory." };
}

// ── 6. Staff velocity check ───────────────────────────────────────────────────
// > 30 vaccinations in the last 60 minutes by the same staff member → suspicious

export const VELOCITY_WINDOW_MS  = 60 * 60 * 1000; // 60 minutes
export const VELOCITY_THRESHOLD  = 30;

export async function checkStaffVelocity(
  input: Pick<CheckInput, "staffId">,
  query: StaffVelocityQuery,
  now = new Date()
): Promise<CheckResult> {
  const since = new Date(now.getTime() - VELOCITY_WINDOW_MS);
  const count = await query(input.staffId, since);

  if (count >= VELOCITY_THRESHOLD) {
    return {
      checkName: "staff_velocity",
      passed:    false,
      severity:  "warn",
      message:   `High velocity: staff recorded ${count} vaccinations in the last 60 minutes (threshold: ${VELOCITY_THRESHOLD}).`,
      alertData: { staffId: input.staffId, count, windowMinutes: 60, threshold: VELOCITY_THRESHOLD },
    };
  }
  return { checkName: "staff_velocity", passed: true, severity: "warn", message: `Staff velocity OK (${count} in last 60 min).` };
}

// ── 7. Excess doses check (bonus — uses constants) ────────────────────────────

export function checkExcessDoses(
  input: Pick<CheckInput, "vaccineType" | "doseNumber">
): CheckResult {
  const maxDoses = VACCINE_MAX_DOSES[input.vaccineType] ?? 1;
  if (input.doseNumber > maxDoses) {
    return {
      checkName: "excess_doses",
      passed:    false,
      severity:  "block",
      message:   `Dose ${input.doseNumber} exceeds maximum allowed doses (${maxDoses}) for ${input.vaccineType}.`,
      alertData: { vaccineType: input.vaccineType, doseNumber: input.doseNumber, maxDoses },
    };
  }
  return { checkName: "excess_doses", passed: true, severity: "block", message: `Dose number ${input.doseNumber} is within allowed range.` };
}

// ── runAllChecks — wires DB queries from Mongoose models ─────────────────────

export async function runAllChecks(input: CheckInput): Promise<DetectorOutput> {
  // Lazy-import DB models — only available in server context
  const { VaccinationRecord, Inventory } = await import("@/lib/db");
  const mongoose = (await import("mongoose")).default;

  const centerObjId = new mongoose.Types.ObjectId(input.centerId);
  const staffObjId  = new mongoose.Types.ObjectId(input.staffId);
  const userObjId   = new mongoose.Types.ObjectId(input.userId);

  const results = await Promise.all([
    checkDuplicateDose(input, async (userId, vaccineType, doseNumber) => {
      const count = await VaccinationRecord.countDocuments({
        userId: new mongoose.Types.ObjectId(userId),
        vaccineType,
        doseNumber,
        pendingSync: false,
      });
      return count > 0;
    }),

    checkSameDayMultiLocation(input, async (userId, centerId, todayStart, todayEnd) => {
      return VaccinationRecord.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        centerId: { $ne: new mongoose.Types.ObjectId(centerId) },
        createdAt: { $gte: todayStart, $lte: todayEnd },
        pendingSync: false,
      }).select("centerId").lean();
    }),

    Promise.resolve(checkQrSignature(input)),

    Promise.resolve(checkNidFormat(input)),

    checkBatchIntegrity(input, async (centerId, batchNo) => {
      const count = await Inventory.countDocuments({
        centerId: new mongoose.Types.ObjectId(centerId),
        batchNo,
        quantity: { $gt: 0 },
      });
      return count > 0;
    }),

    checkStaffVelocity(input, async (staffId, since) => {
      return VaccinationRecord.countDocuments({
        staffId: new mongoose.Types.ObjectId(staffId),
        createdAt: { $gte: since },
        pendingSync: false,
      });
    }),

    Promise.resolve(checkExcessDoses(input)),
  ]);

  const passed               = results.every((r) => r.passed || r.severity !== "block");
  const requiresConfirmation = results.some((r)  => !r.passed && r.severity === "warn");

  return { passed, requiresConfirmation, results };
}
