// GET /api/worker/inventory
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Inventory, VaccinationRecord, AuditLog } from "@/lib/db";
import mongoose from "mongoose";
import { VACCINE_TYPES } from "@/lib/constants";
import type { VaccineType } from "@/lib/constants";

export async function GET(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = 20;
  const filterVaccine = searchParams.get("vaccine") ?? "";
  const filterFrom = searchParams.get("from") ?? "";
  const filterTo = searchParams.get("to") ?? "";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

  const [batches, monthlyDoses, dailyUsage] = await Promise.all([
    Inventory.find({ centerId }).sort({ expiryDate: 1 }).lean(),
    VaccinationRecord.aggregate([
      { $match: { centerId, createdAt: { $gte: monthStart }, pendingSync: false } },
      { $group: { _id: "$vaccineType", count: { $sum: 1 } } },
    ]),
    VaccinationRecord.aggregate([
      { $match: { centerId, createdAt: { $gte: thirtyDaysAgo }, pendingSync: false } },
      { $group: { _id: "$vaccineType", count: { $sum: 1 } } },
    ]),
  ]);

  const doseMap: Record<string, number> = {};
  for (const d of monthlyDoses) doseMap[d._id] = d.count;
  const avgDailyMap: Record<string, number> = {};
  for (const d of dailyUsage) avgDailyMap[d._id] = d.count / 30;

  // Aggregate batches per vaccine type
  const stockByType: Record<string, {
    totalQty: number; threshold: number;
    nearestExpiry: Date | null; nearestExpiryBatch: string;
  }> = {};
  for (const b of batches) {
    const vt = b.vaccineType as string;
    if (!stockByType[vt]) stockByType[vt] = { totalQty: 0, threshold: b.threshold, nearestExpiry: null, nearestExpiryBatch: "" };
    stockByType[vt].totalQty += b.quantity;
    stockByType[vt].threshold = Math.max(stockByType[vt].threshold, b.threshold);
    if (!stockByType[vt].nearestExpiry || b.expiryDate < stockByType[vt].nearestExpiry!) {
      stockByType[vt].nearestExpiry = b.expiryDate;
      stockByType[vt].nearestExpiryBatch = b.batchNo;
    }
  }

  const stockCards = VACCINE_TYPES.map((vt: VaccineType) => {
    const s = stockByType[vt];
    const qty = s?.totalQty ?? 0;
    const threshold = s?.threshold ?? 20;
    const avgDaily = avgDailyMap[vt] ?? 0;
    const daysRemaining = avgDaily > 0 ? Math.floor(qty / avgDaily) : null;
    const nearestExpiry = s?.nearestExpiry ?? null;
    const daysToExpiry = nearestExpiry ? Math.ceil((nearestExpiry.getTime() - now.getTime()) / 86_400_000) : null;

    let status: "green" | "amber" | "red" = "green";
    if (qty === 0 || (daysToExpiry !== null && daysToExpiry < 0)) status = "red";
    else if (qty <= threshold || (daysToExpiry !== null && daysToExpiry <= 30) || (daysRemaining !== null && daysRemaining <= 7)) status = "amber";

    return {
      vaccineType: vt, totalQty: qty,
      dosesThisMonth: doseMap[vt] ?? 0,
      daysRemaining, nearestExpiry: nearestExpiry?.toISOString() ?? null,
      nearestExpiryBatch: s?.nearestExpiryBatch ?? "",
      threshold, status,
    };
  });

  const expiryBatches = batches.map((b) => ({
    id: String(b._id),
    vaccineType: b.vaccineType,
    batchNo: b.batchNo,
    lotNo: b.lotNo ?? "",
    quantity: b.quantity,
    expiryDate: b.expiryDate.toISOString(),
    daysUntilExpiry: Math.ceil((b.expiryDate.getTime() - now.getTime()) / 86_400_000),
    isExpired: b.expiryDate < now,
  }));

  // Transaction log from audit log
  const txFilter: Record<string, unknown> = { centerId, resourceType: "Inventory" };
  if (filterVaccine) txFilter["metadata.vaccineType"] = filterVaccine;
  if (filterFrom || filterTo) {
    txFilter.createdAt = {};
    if (filterFrom) (txFilter.createdAt as Record<string, unknown>).$gte = new Date(filterFrom);
    if (filterTo) (txFilter.createdAt as Record<string, unknown>).$lte = new Date(filterTo + "T23:59:59Z");
  }

  const [txTotal, txDocs] = await Promise.all([
    AuditLog.countDocuments(txFilter),
    AuditLog.find(txFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate<{ staffId: { name: string } }>("staffId", "name")
      .lean(),
  ]);

  const transactions = txDocs.map((t) => ({
    id: String(t._id),
    timestamp: t.createdAt,
    action: t.action,
    vaccineType: (t.metadata?.vaccineType as string) ?? "",
    quantityChange: (t.metadata?.quantityChange as number) ?? 0,
    batchNo: (t.metadata?.batchNo as string) ?? "",
    staffName: (t.staffId as unknown as { name: string })?.name ?? "System",
    notes: (t.metadata?.notes as string) ?? "",
  }));

  return NextResponse.json({
    stockCards, expiryBatches,
    transactions, txTotal, txPage: page,
    txTotalPages: Math.ceil(txTotal / pageSize),
  });
}
