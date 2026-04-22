// PATCH /api/worker/settings/notifications
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Center, AuditLog } from "@/lib/db";
import mongoose from "mongoose";
import { z } from "zod";

const schema = z.object({
  newBooking:    z.boolean(),
  cancellation:  z.boolean(),
  lowStock:      z.boolean(),
  fraud:         z.boolean(),
  shiftReminder: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  await Center.findByIdAndUpdate(centerId, { $set: { notificationPrefs: parsed.data } });

  await AuditLog.create({
    centerId,
    staffId: new mongoose.Types.ObjectId(session.user.id),
    action: "slot_configured",
    resourceType: "User",
    metadata: { section: "notifications", prefs: parsed.data },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ message: "Notification preferences saved" });
}
