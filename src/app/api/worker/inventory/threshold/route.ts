// PATCH /api/worker/inventory/threshold
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Inventory } from "@/lib/db";
import mongoose from "mongoose";

export async function PATCH(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const body = await req.json();
  const { vaccineType, threshold } = body as { vaccineType: string; threshold: number };

  if (!vaccineType || threshold == null || threshold < 0)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  await Inventory.updateMany({ centerId, vaccineType }, { $set: { threshold } });

  return NextResponse.json({ success: true });
}
