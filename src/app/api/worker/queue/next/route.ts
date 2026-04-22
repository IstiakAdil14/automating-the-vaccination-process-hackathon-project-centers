// POST /api/worker/queue/next — call next waiting token
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, QueueToken } from "@/lib/db";
import { broadcastQueueUpdate } from "../stream/route";
import { AuditLogger, AuditAction, extractRequestContext } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const centerId = session.user.centerId;
  const today = new Date().toISOString().slice(0, 10);
  await connectDB();

  // Mark any currently "called" token as in_progress → done if staff calls next
  await QueueToken.updateMany(
    { centerId, date: today, status: { $in: ["called", "in_progress"] } },
    { $set: { status: "done", completedAt: new Date() } }
  );

  // Get next waiting token (appointments first via appointmentId, then walk-ins)
  const next = await QueueToken.findOneAndUpdate(
    { centerId, date: today, status: "waiting" },
    { $set: { status: "called", calledAt: new Date() }, $inc: { missedCalls: 0 } },
    { sort: { appointmentId: -1, tokenNumber: 1 }, new: true }
  );

  if (!next) {
    return NextResponse.json({ message: "Queue is empty" }, { status: 200 });
  }

  broadcastQueueUpdate(String(centerId));

  AuditLogger.log(
    { staffId: session.user.id, centerId, ...extractRequestContext(_req) },
    {
      action:       AuditAction.QUEUE_NEXT,
      resourceType: "QueueToken",
      resourceId:   String(next._id),
      metadata:     { tokenNumber: next.tokenNumber, vaccineType: next.vaccineType },
    }
  );

  return NextResponse.json({
    id: String(next._id),
    tokenNumber: next.tokenNumber,
    patientName: next.patientInfo.name,
    vaccineType: next.vaccineType,
  });
}
