// POST /api/worker/queue/checkin — check in appointment, add to queue with priority
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, QueueToken, Appointment } from "@/lib/db";
import { broadcastQueueUpdate } from "../stream/route";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingRef } = await req.json();
  if (!bookingRef) return NextResponse.json({ error: "bookingRef required" }, { status: 400 });

  const centerId = session.user.centerId;
  const today = new Date().toISOString().slice(0, 10);
  await connectDB();

  // bookingRef is the appointment _id
  const appointment = await Appointment.findOne({
    _id: bookingRef,
    centerId,
    date: today,
    status: { $in: ["pending", "confirmed"] },
  }).populate<{ userId: { name: string; phone?: string } }>("userId", "name phone");

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found or already checked in" }, { status: 404 });
  }

  // Check not already in queue
  const existing = await QueueToken.findOne({ centerId, date: today, appointmentId: appointment._id });
  if (existing) {
    return NextResponse.json({ error: "Already in queue", tokenNumber: existing.tokenNumber }, { status: 409 });
  }

  // Priority: appointment tokens get a low tokenNumber prefix (1-500 range)
  // Walk-ins start at 501+. Find next available in 1-500.
  const lastAppt = await QueueToken.findOne({ centerId, date: today, appointmentId: { $exists: true } })
    .sort({ tokenNumber: -1 }).select("tokenNumber").lean();
  const tokenNumber = Math.min((lastAppt?.tokenNumber ?? 0) + 1, 500);

  const patientName = (appointment.userId as any)?.name ?? "Patient";
  const patientPhone = (appointment.userId as any)?.phone ?? "";

  const token = await QueueToken.create({
    centerId,
    date: today,
    tokenNumber,
    patientInfo: { name: patientName, phone: patientPhone },
    appointmentId: appointment._id,
    vaccineType: appointment.vaccineType,
    status: "waiting",
    missedCalls: 0,
  });

  await Appointment.findByIdAndUpdate(appointment._id, {
    $set: { checkedIn: true, checkedInAt: new Date() },
  });

  broadcastQueueUpdate(String(centerId));

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.APPOINTMENT_CHECKIN,
    resourceType: "Appointment",
    resourceId:   String(appointment._id),
    metadata:     { tokenNumber, vaccineType: appointment.vaccineType, queueTokenId: String(token._id) },
  });

  return NextResponse.json({
    id: String(token._id),
    tokenNumber,
    patientName,
    vaccineType: appointment.vaccineType,
  });
}
