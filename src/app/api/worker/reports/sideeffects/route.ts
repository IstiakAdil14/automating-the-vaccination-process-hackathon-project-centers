// GET /api/worker/reports/sideeffects?from=&to=
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, VaccinationRecord } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const { searchParams } = new URL(req.url);

  const now = new Date();
  const from = searchParams.get("from") ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to   = searchParams.get("to")   ?? now.toISOString().slice(0, 10);

  const match = {
    centerId,
    pendingSync: false,
    adverseReaction: { $exists: true, $ne: "" },
    createdAt: { $gte: new Date(from), $lte: new Date(to + "T23:59:59Z") },
  };

  const [reports, dailyTrend] = await Promise.all([
    VaccinationRecord.find(match)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate<{ userId: { name: string } }>("userId", "name")
      .populate<{ staffId: { name: string } }>("staffId", "name")
      .lean(),
    VaccinationRecord.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Simple severity classification based on keywords
  function classify(text: string): "mild" | "moderate" | "severe" {
    const t = text.toLowerCase();
    if (t.includes("anaphylaxis") || t.includes("seizure") || t.includes("hospitali")) return "severe";
    if (t.includes("fever") || t.includes("vomit") || t.includes("rash") || t.includes("swelling")) return "moderate";
    return "mild";
  }

  return NextResponse.json({
    from, to,
    total: reports.length,
    reports: reports.map((r) => ({
      id: String(r._id),
      patientName: (r.userId as unknown as { name: string })?.name
        ? (r.userId as unknown as { name: string }).name.slice(0, 2) + "***"
        : "Unknown",
      staffName: (r.staffId as unknown as { name: string })?.name ?? "Unknown",
      vaccineType: r.vaccineType,
      doseNumber: r.doseNumber,
      reaction: r.adverseReaction!,
      severity: classify(r.adverseReaction!),
      createdAt: r.createdAt.toISOString(),
    })),
    dailyTrend: dailyTrend.map((d: { _id: string; count: number }) => ({ date: d._id, count: d.count })),
  });
}
