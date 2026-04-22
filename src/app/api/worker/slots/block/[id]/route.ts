// app/api/worker/slots/block/[id]/route.ts
// DELETE /api/worker/slots/block/:id — unblock all dates sharing a blockId

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, SlotConfig } from "@/lib/db";
import mongoose from "mongoose";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "center_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: blockId } = await params;
  if (!blockId) return NextResponse.json({ error: "blockId required" }, { status: 400 });

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const result = await SlotConfig.deleteMany({ centerId, blockId });

  return NextResponse.json({ data: { deleted: result.deletedCount } });
}
