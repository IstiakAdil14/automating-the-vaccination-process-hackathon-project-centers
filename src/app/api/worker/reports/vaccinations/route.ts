// GET /api/worker/reports/vaccinations
// ?from=YYYY-MM-DD&to=YYYY-MM-DD&vaccineType=&compareFrom=&compareTo=
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, VaccinationRecord } from "@/lib/db";
import mongoose from "mongoose";

function dateRange(from: string, to: string) {
  return { $gte: new Date(from), $lte: new Date(to + "T23:59:59Z") };
}

export async function GET(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const { searchParams } = new URL(req.url);

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultTo   = now.toISOString().slice(0, 10);

  const from        = searchParams.get("from")        ?? defaultFrom;
  const to          = searchParams.get("to")          ?? defaultTo;
  const vaccineType = searchParams.get("vaccineType") ?? "";
  const compareFrom = searchParams.get("compareFrom") ?? "";
  const compareTo   = searchParams.get("compareTo")   ?? "";

  const baseMatch: Record<string, unknown> = {
    centerId,
    pendingSync: false,
    createdAt: dateRange(from, to),
  };
  if (vaccineType) baseMatch.vaccineType = vaccineType;

  const [dailyCounts, byVaccine, sideEffectCount] = await Promise.all([
    // Daily bar chart data
    VaccinationRecord.aggregate([
      { $match: baseMatch },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]),
    // Vaccine type breakdown (pie chart)
    VaccinationRecord.aggregate([
      { $match: { ...baseMatch } },
      { $group: { _id: "$vaccineType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Side effects count
    VaccinationRecord.countDocuments({
      ...baseMatch,
      adverseReaction: { $exists: true, $ne: "" },
    }),
  ]);

  // MoM comparison
  let compareData: { total: number; byVaccine: { type: string; count: number }[] } | null = null;
  if (compareFrom && compareTo) {
    const cmpMatch: Record<string, unknown> = {
      centerId, pendingSync: false,
      createdAt: dateRange(compareFrom, compareTo),
    };
    if (vaccineType) cmpMatch.vaccineType = vaccineType;

    const [cmpTotal, cmpByVaccine] = await Promise.all([
      VaccinationRecord.countDocuments(cmpMatch),
      VaccinationRecord.aggregate([
        { $match: cmpMatch },
        { $group: { _id: "$vaccineType", count: { $sum: 1 } } },
      ]),
    ]);
    compareData = {
      total: cmpTotal,
      byVaccine: cmpByVaccine.map((r) => ({ type: r._id, count: r.count })),
    };
  }

  const total = dailyCounts.reduce((s: number, d: { count: number }) => s + d.count, 0);

  return NextResponse.json({
    from, to,
    total,
    sideEffectCount,
    dailyCounts: dailyCounts.map((d: { _id: string; count: number }) => ({ date: d._id, count: d.count })),
    byVaccine: byVaccine.map((v: { _id: string; count: number }) => ({ type: v._id, count: v.count })),
    compareData,
  });
}
