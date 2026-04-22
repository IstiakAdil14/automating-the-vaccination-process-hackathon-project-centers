// POST /api/worker/appointments/[id]/reschedule
import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Appointment, SlotConfig } from "@/lib/db";
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
  const { newDate, newTimeSlot } = body as { newDate: string; newTimeSlot: string };

  if (!newDate || !newTimeSlot)
    return NextResponse.json({ error: "newDate and newTimeSlot are required" }, { status: 400 });

  if (newDate < new Date().toISOString().slice(0, 10))
    return NextResponse.json({ error: "Cannot reschedule to a past date" }, { status: 400 });

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const appointment = await Appointment.findOne({
    _id: new mongoose.Types.ObjectId(id),
    centerId,
    status: { $in: ["pending", "confirmed", "no_show"] },
  });

  if (!appointment)
    return NextResponse.json({ error: "Appointment not found or cannot be rescheduled" }, { status: 404 });

  // Check slot availability: count existing bookings for that date+slot at this center
  const slotConfig = await SlotConfig.findOne({ centerId, date: newDate, isBlocked: false }).lean();
  if (!slotConfig)
    return NextResponse.json({ error: "No slot configured for that date" }, { status: 409 });

  const bookedCount = await Appointment.countDocuments({
    centerId,
    date: newDate,
    timeSlot: newTimeSlot,
    status: { $in: ["pending", "confirmed"] },
  });

  if (bookedCount >= slotConfig.totalCapacity)
    return NextResponse.json({ error: "Slot is fully booked" }, { status: 409 });

  const oldDate = appointment.date;
  const oldSlot = appointment.timeSlot;

  await Appointment.findByIdAndUpdate(appointment._id, {
    $set: {
      date: newDate,
      timeSlot: newTimeSlot,
      status: "confirmed",
      checkedIn: false,
      checkedInAt: undefined,
      notes: `Rescheduled by staff from ${oldDate} ${oldSlot}`,
    },
  });

  // Notify patient
  await NotificationModel.create({
    userId: appointment.userId,
    type: "appointment_rescheduled",
    message: `Your ${appointment.vaccineType} appointment has been rescheduled to ${newDate} at ${newTimeSlot} by center staff.`,
    read: false,
  });

  return NextResponse.json({ success: true, newDate, newTimeSlot });
}
