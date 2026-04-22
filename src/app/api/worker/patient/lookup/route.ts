// app/api/worker/patient/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, User, Appointment, VaccinationRecord } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const nid = searchParams.get("nid")?.trim();
  const bookingRef = searchParams.get("bookingRef")?.trim();
  const qr = searchParams.get("qr")?.trim();

  if (!nid && !bookingRef && !qr)
    return NextResponse.json({ error: "Provide nid, bookingRef, or qr" }, { status: 400 });

  await connectDB();

  let userId: string | null = null;
  let appointmentId: string | null = null;
  let vaccineTypeHint: string | null = null;

  if (qr) {
    // QR payload: "vcbd:<userId>:<hmac>" — extract userId; tamper check done in /validate
    const parts = qr.split(":");
    if (parts.length >= 2 && mongoose.isValidObjectId(parts[1])) {
      userId = parts[1];
    } else {
      return NextResponse.json({ error: "Invalid QR code" }, { status: 400 });
    }
  } else if (bookingRef) {
    if (!mongoose.isValidObjectId(bookingRef))
      return NextResponse.json({ error: "Invalid booking reference" }, { status: 400 });
    const appt = await Appointment.findById(bookingRef)
      .select("userId vaccineType status centerId")
      .lean();
    if (!appt) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (String(appt.centerId) !== session.user.centerId)
      return NextResponse.json({ error: "Booking belongs to a different center" }, { status: 403 });
    userId = String(appt.userId);
    appointmentId = String(appt._id);
    vaccineTypeHint = appt.vaccineType;
  } else if (nid) {
    const user = await User.findOne({ nid, role: "citizen" }).select("_id").lean();
    if (!user) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    userId = String(user._id);
  }

  if (!userId) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const patient = await User.findById(userId)
    .select("name nid dob phone role isActive")
    .lean();

  if (!patient || patient.role !== "citizen")
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const history = await VaccinationRecord.find({ userId, pendingSync: false })
    .select("vaccineType doseNumber batchNo adminSite createdAt centerId")
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({
    patient: {
      id: userId,
      name: patient.name,
      nid: patient.nid ?? null,
      dob: patient.dob ? (patient.dob as Date).toISOString() : null,
      phone: patient.phone ?? null,
      isActive: patient.isActive,
    },
    history: history.map((r) => ({
      id: String(r._id),
      vaccineType: r.vaccineType,
      doseNumber: r.doseNumber,
      batchNo: r.batchNo,
      adminSite: r.adminSite,
      date: r.createdAt.toISOString(),
      centerId: String(r.centerId),
    })),
    appointmentId,
    vaccineTypeHint,
  });
}
