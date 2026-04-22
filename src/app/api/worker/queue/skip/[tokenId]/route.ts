// POST /api/worker/queue/skip/[tokenId] — skip token (move to end of queue)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, QueueToken } from "@/lib/db";
import { broadcastQueueUpdate } from "../../stream/route";

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

  const token = await QueueToken.findOne({ _id: tokenId, centerId, date: today });
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });

  const missedCalls = (token.missedCalls ?? 0) + 1;

  // Get current max tokenNumber to move to end
  const last = await QueueToken.findOne({ centerId, date: today })
    .sort({ tokenNumber: -1 }).select("tokenNumber").lean();
  const newTokenNumber = (last?.tokenNumber ?? token.tokenNumber) + 1;

  token.set({
    status: "waiting",
    tokenNumber: newTokenNumber,
    missedCalls,
    calledAt: undefined,
  });
  await token.save();

  broadcastQueueUpdate(String(centerId));

  return NextResponse.json({ missedCalls, newTokenNumber });
}
