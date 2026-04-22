// GET /api/worker/staff/[id]
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, User, VaccinationRecord, AuditLog, ShiftAssignment, Center } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const staffObjId = new mongoose.Types.ObjectId(id);

  const staffDoc = await User.findOne({ _id: staffObjId, centerId })
    .select("name email phone role nid dob isActive createdAt lastLogin")
    .lean();

  if (!staffDoc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [vaccinationHistory, auditTrail, shifts, centerHistory] = await Promise.all([
    VaccinationRecord.find({ staffId: staffObjId, pendingSync: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate<{ userId: { name: string } }>("userId", "name")
      .lean(),
    AuditLog.find({ staffId: staffObjId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    ShiftAssignment.find({ staffId: staffObjId })
      .sort({ date: -1 })
      .limit(30)
      .lean(),
    // Center history: all centers this staff was ever assigned to (via centerId on user — single center for now)
    Center.find({ _id: centerId }).select("name address district division").lean(),
  ]);

  return NextResponse.json({
    profile: {
      id: String(staffDoc._id),
      name: staffDoc.name,
      email: staffDoc.email,
      phone: staffDoc.phone ?? "",
      role: staffDoc.role === "supervisor" ? "center_manager" : "staff",
      nidMasked: staffDoc.nid ? staffDoc.nid.slice(0, 4) + "****" + staffDoc.nid.slice(-2) : null,
      dob: staffDoc.dob?.toISOString() ?? null,
      isActive: staffDoc.isActive,
      createdAt: staffDoc.createdAt.toISOString(),
      lastLogin: staffDoc.lastLogin?.toISOString() ?? null,
    },
    vaccinationHistory: vaccinationHistory.map((v) => ({
      id: String(v._id),
      patientName: (v.userId as unknown as { name: string })?.name ?? "Unknown",
      vaccineType: v.vaccineType,
      doseNumber: v.doseNumber,
      batchNo: v.batchNo,
      adminSite: v.adminSite,
      createdAt: v.createdAt.toISOString(),
    })),
    auditTrail: auditTrail.map((a) => ({
      id: String(a._id),
      action: a.action,
      resourceType: a.resourceType,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    })),
    recentShifts: shifts.map((s) => ({
      date: s.date,
      shift: s.shift,
    })),
    centerHistory: centerHistory.map((c) => ({
      id: String(c._id),
      name: c.name,
      address: c.address,
      district: c.district,
      division: c.division,
    })),
  });
}
