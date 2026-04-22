// POST /api/worker/inventory/wastage
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Inventory } from "@/lib/db";
import mongoose from "mongoose";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const body = await req.json();
  const { batchId, quantity, reason } = body as {
    batchId: string; quantity: number; reason?: string;
  };

  if (!batchId || !quantity || quantity <= 0)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const staffId = new mongoose.Types.ObjectId(session.user.id);

  const batch = await Inventory.findOne({
    _id: new mongoose.Types.ObjectId(batchId),
    centerId,
  });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.quantity < quantity)
    return NextResponse.json({ error: "Wastage quantity exceeds available stock" }, { status: 409 });

  await Inventory.findByIdAndUpdate(batch._id, { $inc: { quantity: -quantity } });

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.INVENTORY_WASTAGE,
    resourceType: "Inventory",
    resourceId:   String(batch._id),
    metadata: {
      vaccineType: batch.vaccineType,
      quantityChange: -quantity,
      batchNo: batch.batchNo,
      reason: reason ?? null,
    },
  });

  return NextResponse.json({ success: true });
}
