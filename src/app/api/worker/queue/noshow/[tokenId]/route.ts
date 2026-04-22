// POST /api/worker/queue/noshow/[tokenId] — mark token as no-show
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, QueueToken } from "@/lib/db";
import { broadcastQueueUpdate } from "../../stream/route";
import { AuditLogger, AuditAction, extractRequestContext } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const session = await auth();
  if (!session?.user?.centerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tokenId } = await params;
  const centerId = session.user.centerId;
  const today = new Date().toISOString().slice(0, 10);
  await connectDB();

  const token = await QueueToken.findOneAndUpdate(
    { _id: tokenId, centerId, date: today },
    { $set: { status: "deferred" } },
    { new: true }
  );
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  broadcastQueueUpdate(String(centerId));

  AuditLogger.log(
    { staffId: session.user.id, centerId, ...extractRequestContext(_req) },
    {
      action:       AuditAction.QUEUE_NOSHOW,
      resourceType: "QueueToken",
      resourceId:   tokenId,
      metadata:     { tokenNumber: token.tokenNumber, vaccineType: token.vaccineType },
    }
  );

  return NextResponse.json({ success: true });
}
