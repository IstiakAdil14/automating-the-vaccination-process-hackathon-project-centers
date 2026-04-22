import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, QueueToken } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const centerId = session.user.centerId;
  const today = new Date().toISOString().slice(0, 10);

  await connectDB();

  const [waiting, inProgress, next3, completedToday] = await Promise.all([
    QueueToken.countDocuments({ centerId, date: today, status: "waiting" }),
    QueueToken.countDocuments({ centerId, date: today, status: { $in: ["called", "in_progress"] } }),
    QueueToken.find({ centerId, date: today, status: "waiting" })
      .sort({ tokenNumber: 1 })
      .limit(3)
      .select("tokenNumber patientInfo vaccineType status")
      .lean(),
    QueueToken.countDocuments({ centerId, date: today, status: "done" }),
  ]);

  const avgWaitMinutes = waiting * 5;

  return NextResponse.json({
    queueLength: waiting,
    inProgress,
    completedToday,
    avgWaitMinutes,
    next3: next3.map((t) => ({
      id: String(t._id),
      tokenNumber: t.tokenNumber,
      patientName: t.patientInfo.name,
      vaccineType: t.vaccineType,
      status: t.status,
    })),
  });
}
