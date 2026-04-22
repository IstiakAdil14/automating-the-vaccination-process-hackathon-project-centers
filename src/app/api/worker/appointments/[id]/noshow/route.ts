// POST /api/worker/appointments/[id]/noshow
import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Appointment } from "@/lib/db";
import mongoose from "mongoose";
import NotificationModel from "@/lib/db/models/Notification";

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

  const body = await req.json();
  const reason: string = body.reason || "Did not arrive for scheduled appointment";

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const appointment = await Appointment.findOne({
    _id: new mongoose.Types.ObjectId(id),
    centerId,
    status: { $in: ["pending", "confirmed"] },
  });

  if (!appointment)
    return NextResponse.json({ error: "Appointment not found or already actioned" }, { status: 404 });

  await Appointment.findByIdAndUpdate(appointment._id, {
    $set: { status: "no_show", notes: reason },
  });

  // Notify patient
  await NotificationModel.create({
    userId: appointment.userId,
    type: "appointment_no_show",
    message: `Your ${appointment.vaccineType} appointment on ${appointment.date} at ${appointment.timeSlot} was marked as no-show. Reason: ${reason}. Please reschedule via the citizen app.`,
    read: false,
  });

  return NextResponse.json({ success: true });
}
