// POST /api/worker/queue/token — generate walk-in token
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, QueueToken } from "@/lib/db";
import { broadcastQueueUpdate } from "../stream/route";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, vaccineType } = await req.json();
  if (!name || !phone || !vaccineType) {
    return NextResponse.json({ error: "name, phone, vaccineType required" }, { status: 400 });
  }

  const centerId = session.user.centerId;
  const today = new Date().toISOString().slice(0, 10);
  await connectDB();

  // Atomic increment: find max tokenNumber for today at this center
  const last = await QueueToken.findOne({ centerId, date: today })
    .sort({ tokenNumber: -1 }).select("tokenNumber").lean();
  const tokenNumber = (last?.tokenNumber ?? 0) + 1;

  const token = await QueueToken.create({
    centerId,
    date: today,
    tokenNumber,
    patientInfo: { name, phone },
    vaccineType,
    status: "waiting",
    missedCalls: 0,
  });

  broadcastQueueUpdate(String(centerId));

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.QUEUE_TOKEN,
    resourceType: "QueueToken",
    resourceId:   String(token._id),
    metadata:     { tokenNumber, vaccineType, patientName: name },
  });

  return NextResponse.json({
    id: String(token._id),
    tokenNumber,
    patientName: name,
    vaccineType,
    date: today,
  });
}
