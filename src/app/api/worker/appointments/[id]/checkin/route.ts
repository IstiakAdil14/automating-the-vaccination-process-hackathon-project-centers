// POST /api/worker/appointments/[id]/checkin
import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Appointment, QueueToken } from "@/lib/db";
import mongoose from "mongoose";
import { broadcastQueueUpdate } from "@/app/api/worker/queue/stream/route";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try { session = await requireApiSession(); }
  catch (e) { return e as Response; }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id))
    return NextResponse.json({ error: "Invalid appointment ID" }, { status: 400 });

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const appointment = await Appointment.findOne({
    _id: new mongoose.Types.ObjectId(id),
    centerId,
    status: { $in: ["pending", "confirmed"] },
    checkedIn: false,
  }).populate<{ userId: { name: string; phone?: string } }>("userId", "name phone");

  if (!appointment)
    return NextResponse.json({ error: "Appointment not found or already checked in" }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);

  // Prevent duplicate queue entry
  const existing = await QueueToken.findOne({ centerId, date: today, appointmentId: appointment._id });
  if (existing)
    return NextResponse.json({ error: "Already in queue", tokenNumber: existing.tokenNumber }, { status: 409 });

  // Appointment tokens: 1–500 range (priority over walk-ins)
  const lastAppt = await QueueToken.findOne({ centerId, date: today, appointmentId: { $exists: true } })
    .sort({ tokenNumber: -1 }).select("tokenNumber").lean();
  const tokenNumber = Math.min((lastAppt?.tokenNumber ?? 0) + 1, 500);

  const user = appointment.userId as unknown as { name: string; phone?: string };

  const token = await QueueToken.create({
    centerId,
    date: today,
    tokenNumber,
    patientInfo: { name: user?.name ?? "Patient", phone: user?.phone ?? "" },
    appointmentId: appointment._id,
    vaccineType: appointment.vaccineType,
    status: "waiting",
    missedCalls: 0,
  });

  await Appointment.findByIdAndUpdate(appointment._id, {
    $set: { checkedIn: true, checkedInAt: new Date(), status: "confirmed" },
  });

  broadcastQueueUpdate(session.user.centerId);

  return NextResponse.json({
    success: true,
    tokenNumber,
    patientName: user?.name ?? "Patient",
    vaccineType: appointment.vaccineType,
    queueTokenId: String(token._id),
  });
}
