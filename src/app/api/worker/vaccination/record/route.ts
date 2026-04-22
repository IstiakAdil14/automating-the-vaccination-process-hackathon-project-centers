// app/api/worker/vaccination/record/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import {
  connectDB, VaccinationRecord, Inventory,
} from "@/lib/db";
import mongoose from "mongoose";
import type { AdminSite } from "@/lib/db";
import type { VaccineType } from "@/lib/constants";
import NotificationModel from "@/lib/db/models/Notification";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    userId, vaccineType, doseNumber, batchNo, lotNo,
    expiryDate, adminSite, appointmentId, adverseReaction, inventoryId,
    offlineTimestamp, // ISO string set by client when record was created offline
  } = body as {
    userId: string;
    vaccineType: VaccineType;
    doseNumber: number;
    batchNo: string;
    lotNo: string;
    expiryDate: string;
    adminSite: AdminSite;
    appointmentId?: string;
    adverseReaction?: string;
    inventoryId?: string;
    offlineTimestamp?: string; // original offline action time for audit trail
  };

  if (!userId || !vaccineType || !doseNumber || !batchNo || !lotNo || !expiryDate || !adminSite)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  await connectDB();

  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const staffId = new mongoose.Types.ObjectId(session.user.id);
  const patientId = new mongoose.Types.ObjectId(userId);

  // ── 1. Check inventory ────────────────────────────────────────────────────
  const inventoryQuery = inventoryId && mongoose.isValidObjectId(inventoryId)
    ? { _id: new mongoose.Types.ObjectId(inventoryId), centerId, quantity: { $gt: 0 } }
    : { centerId, vaccineType, batchNo, quantity: { $gt: 0 } };
  const inventoryItem = await Inventory.findOne(inventoryQuery);
  if (!inventoryItem)
    return NextResponse.json({ error: "Inventory empty or batch not found for this center." }, { status: 409 });

  // ── 2. Save vaccination record ────────────────────────────────────────────
  const record = await VaccinationRecord.create({
    userId: patientId,
    centerId,
    staffId,
    appointmentId: appointmentId ? new mongoose.Types.ObjectId(appointmentId) : undefined,
    vaccineType,
    doseNumber,
    batchNo,
    lotNo,
    expiryDate: new Date(expiryDate),
    adminSite,
    adverseReaction: adverseReaction || undefined,
    pendingSync: false,
  });

  // ── 3. Decrement inventory ────────────────────────────────────────────────
  await Inventory.findByIdAndUpdate(inventoryItem._id, { $inc: { quantity: -1 } });

  // ── 4. Schedule 24h side-effect reminder notification ─────────────────────
  const reminderAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await NotificationModel.create({
    userId: patientId,
    type: "side_effect_reminder",
    message: `Please report any side effects from your ${vaccineType} (Dose ${doseNumber}) received today.`,
    read: false,
    scheduledAt: reminderAt,
    createdAt: new Date(),
  });

  // ── 5. Audit log ──────────────────────────────────────────────────────────
  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.VACCINATION_RECORD,
    resourceType: "VaccinationRecord",
    resourceId:   String(record._id),
    metadata: {
      userId,
      vaccineType,
      doseNumber,
      batchNo,
      lotNo,
      adminSite,
      appointmentId: appointmentId ?? null,
    },
    // Preserve original offline timestamp when record was created while offline
    occurredAt: offlineTimestamp ?? undefined,
  });

  return NextResponse.json({ success: true, recordId: String(record._id) }, { status: 201 });
}
