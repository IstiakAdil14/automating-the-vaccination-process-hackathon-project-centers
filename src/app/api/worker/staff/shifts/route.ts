// POST /api/worker/staff/shifts
// Body: { staffId, date, shift, action: "assign" | "remove" }
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, ShiftAssignment } from "@/lib/db";
import mongoose from "mongoose";
import { z } from "zod";

const schema = z.object({
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: z.enum(["morning", "afternoon", "night"]),
  action: z.enum(["assign", "remove"]),
});

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }

  const { staffId, date, shift, action } = parsed.data;
  await connectDB();

  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const staffObjId = new mongoose.Types.ObjectId(staffId);
  const assignedBy = new mongoose.Types.ObjectId(session.user.id);

  if (action === "remove") {
    await ShiftAssignment.deleteOne({ centerId, staffId: staffObjId, date, shift });
    return NextResponse.json({ message: "Shift removed" });
  }

  // assign — upsert
  await ShiftAssignment.findOneAndUpdate(
    { centerId, staffId: staffObjId, date, shift },
    { centerId, staffId: staffObjId, date, shift, assignedBy },
    { upsert: true, new: true }
  );

  return NextResponse.json({ message: "Shift assigned" });
}
