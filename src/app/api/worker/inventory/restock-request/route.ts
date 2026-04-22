// POST /api/worker/inventory/restock-request
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, StaffRequest } from "@/lib/db";
import mongoose from "mongoose";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const body = await req.json();
  const { vaccineType, requestedQuantity, notes, urgency } = body as {
    vaccineType: string; requestedQuantity: number;
    notes?: string; urgency?: "normal" | "high";
  };

  if (!vaccineType || !requestedQuantity || requestedQuantity <= 0)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const staffId = new mongoose.Types.ObjectId(session.user.id);

  const reason = `Restock request for ${vaccineType}: ${requestedQuantity} vials.${notes ? " " + notes : ""}`;

  const request = await StaffRequest.create({
    centerId,
    requestType: "restock",
    reason,
    urgency: urgency === "high" ? "high" : "normal",
    requestedBy: staffId,
  });

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.RESTOCK_REQUEST,
    resourceType: "Inventory",
    resourceId:   String(request._id),
    metadata:     { vaccineType, requestedQuantity, urgency: urgency ?? "normal", notes: notes ?? null },
  });

  return NextResponse.json({ success: true, requestId: String(request._id) }, { status: 201 });
}
