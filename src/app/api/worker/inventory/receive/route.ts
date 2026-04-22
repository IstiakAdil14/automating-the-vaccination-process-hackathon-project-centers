// POST /api/worker/inventory/receive
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
  const { vaccineType, quantity, batchNo, lotNo, expiryDate, deliveryDate, supplierName } = body as {
    vaccineType: string; quantity: number; batchNo: string;
    lotNo?: string; expiryDate: string; deliveryDate?: string; supplierName?: string;
  };

  if (!vaccineType || !quantity || !batchNo || !expiryDate)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  if (quantity <= 0)
    return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const staffId = new mongoose.Types.ObjectId(session.user.id);

  const batch = await Inventory.create({
    centerId, vaccineType, quantity, batchNo,
    lotNo: lotNo || undefined,
    expiryDate: new Date(expiryDate),
    receivedAt: deliveryDate ? new Date(deliveryDate) : new Date(),
  });

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.INVENTORY_RECEIVE,
    resourceType: "Inventory",
    resourceId:   String(batch._id),
    metadata: {
      vaccineType, quantityChange: quantity, batchNo,
      lotNo: lotNo ?? null, supplierName: supplierName ?? null,
    },
  });

  return NextResponse.json({ success: true, batchId: String(batch._id) }, { status: 201 });
}
