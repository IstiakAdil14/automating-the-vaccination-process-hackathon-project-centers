// GET /api/worker/reports/staff?from=&to=
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, User, VaccinationRecord, ShiftAssignment } from "@/lib/db";
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

  const fromDate = new Date(from);
  const toDate   = new Date(to + "T23:59:59Z");

  const staff = await User.find({ centerId, role: { $in: ["staff", "supervisor"] } })
    .select("name role isActive createdAt")
    .lean();

  const staffIds = staff.map((s) => s._id);

  // Count shifts in period to compute days attended
  const fromStr = from;
  const toStr   = to;
  const allDates: string[] = [];
  const cur = new Date(fromDate);
  while (cur <= toDate) { allDates.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }

  const [records, shifts] = await Promise.all([
    VaccinationRecord.aggregate([
      { $match: { staffId: { $in: staffIds }, centerId, createdAt: { $gte: fromDate, $lte: toDate }, pendingSync: false } },
      { $group: { _id: "$staffId", count: { $sum: 1 } } },
    ]),
    ShiftAssignment.find({ centerId, staffId: { $in: staffIds }, date: { $gte: fromStr, $lte: toStr } })
      .select("staffId date shift")
      .lean(),
  ]);

  const recMap: Record<string, number> = {};
  for (const r of records) recMap[String(r._id)] = r.count;

  // shifts per staff
  const shiftMap: Record<string, Set<string>> = {};
  for (const s of shifts) {
    const sid = String(s.staffId);
    if (!shiftMap[sid]) shiftMap[sid] = new Set();
    shiftMap[sid].add(s.date);
  }

  const totalWorkdays = allDates.length;

  const result = staff.map((s) => {
    const sid = String(s._id);
    const vaccinations = recMap[sid] ?? 0;
    const daysAttended = shiftMap[sid]?.size ?? 0;
    const hoursWorked  = daysAttended * 6;
    const avgPerHour   = hoursWorked > 0 ? +(vaccinations / hoursWorked).toFixed(2) : 0;
    const attendance   = totalWorkdays > 0 ? Math.round((daysAttended / totalWorkdays) * 100) : 0;

    return {
      id: sid,
      name: s.name,
      role: s.role === "supervisor" ? "center_manager" : "staff",
      isActive: s.isActive,
      vaccinations,
      daysAttended,
      avgPatientsPerHour: avgPerHour,
      attendancePercent: attendance,
    };
  });

  return NextResponse.json({ staff: result, from, to, totalWorkdays });
}
