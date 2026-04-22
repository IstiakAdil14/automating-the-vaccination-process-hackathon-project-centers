// GET /api/worker/staff
import { NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, User, VaccinationRecord, ShiftAssignment } from "@/lib/db";
import mongoose from "mongoose";

function weekBounds() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return { weekStart, weekEnd };
}

function monthBounds() {
  const now = new Date();
  return {
    monthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    monthEnd: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

export async function GET() {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const { weekStart, weekEnd } = weekBounds();
  const { monthStart, monthEnd } = monthBounds();

  const staff = await User.find({ centerId, role: { $in: ["staff", "supervisor"] } })
    .select("name email phone role nid isActive createdAt lastLogin")
    .lean();

  const staffIds = staff.map((s) => s._id);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }

  const [weekRecords, monthRecords, weekShifts] = await Promise.all([
    VaccinationRecord.aggregate([
      { $match: { staffId: { $in: staffIds }, centerId, createdAt: { $gte: weekStart, $lt: weekEnd }, pendingSync: false } },
      { $group: { _id: "$staffId", count: { $sum: 1 } } },
    ]),
    VaccinationRecord.aggregate([
      { $match: { staffId: { $in: staffIds }, centerId, createdAt: { $gte: monthStart, $lt: monthEnd }, pendingSync: false } },
      { $group: { _id: "$staffId", count: { $sum: 1 } } },
    ]),
    ShiftAssignment.find({ centerId, date: { $in: weekDates } })
      .select("staffId date shift")
      .lean(),
  ]);

  const weekMap: Record<string, number> = {};
  for (const r of weekRecords) weekMap[String(r._id)] = r.count;
  const monthMap: Record<string, number> = {};
  for (const r of monthRecords) monthMap[String(r._id)] = r.count;

  const shiftMap: Record<string, Record<string, string[]>> = {};
  for (const s of weekShifts) {
    const sid = String(s.staffId);
    if (!shiftMap[sid]) shiftMap[sid] = {};
    if (!shiftMap[sid][s.date]) shiftMap[sid][s.date] = [];
    shiftMap[sid][s.date].push(s.shift);
  }

  const result = staff.map((s) => {
    const sid = String(s._id);
    const weekVax = weekMap[sid] ?? 0;
    const shiftsThisWeek = Object.values(shiftMap[sid] ?? {}).flat().length;
    const hoursWorked = shiftsThisWeek * 6;
    const avgPerHour = hoursWorked > 0 ? +(weekVax / hoursWorked).toFixed(1) : 0;
    const attendance = shiftsThisWeek > 0 ? Math.min(100, Math.round((shiftsThisWeek / 5) * 100)) : 0;

    return {
      id: sid,
      name: s.name,
      email: s.email,
      phone: s.phone ?? "",
      role: s.role === "supervisor" ? "center_manager" : "staff",
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      lastLogin: s.lastLogin?.toISOString() ?? null,
      nidMasked: s.nid ? s.nid.slice(0, 4) + "****" + s.nid.slice(-2) : null,
      weekShifts: shiftMap[sid] ?? {},
      weekVaccinations: weekVax,
      monthVaccinations: monthMap[sid] ?? 0,
      avgPatientsPerHour: avgPerHour,
      attendancePercent: attendance,
    };
  });

  return NextResponse.json({ staff: result, weekDates });
}
