// GET /api/worker/fraud/alerts
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, FraudAlert } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = 20;
  const status = searchParams.get("status") ?? "";

  const filter: Record<string, unknown> = { centerId };
  if (status) filter.status = status;

  const [total, alerts] = await Promise.all([
    FraudAlert.countDocuments(filter),
    FraudAlert.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate<{ staffId: { name: string; email: string } | null }>("staffId", "name email")
      .lean(),
  ]);

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: String(a._id),
      type: a.type,
      severity: a.severity,
      status: a.status,
      patientNidMasked: a.patientNid
        ? a.patientNid.slice(0, 3) + "****" + a.patientNid.slice(-2)
        : null,
      staffName: (a.staffId as unknown as { name: string } | null)?.name ?? null,
      staffEmail: (a.staffId as unknown as { email: string } | null)?.email ?? null,
      context: a.context,
      createdAt: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}
