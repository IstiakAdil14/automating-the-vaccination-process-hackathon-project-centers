// PATCH /api/worker/settings/hours
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Center } from "@/lib/db";
import mongoose from "mongoose";
import { z } from "zod";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

const timeRe = /^\d{2}:\d{2}$/;

const DaySchema = z.object({
  open:   z.string().regex(timeRe),
  close:  z.string().regex(timeRe),
  closed: z.boolean(),
});

const OverrideSchema = z.object({
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  open:   z.string().regex(timeRe),
  close:  z.string().regex(timeRe),
  closed: z.boolean(),
  note:   z.string().max(200).optional(),
});

const schema = z.object({
  weekSchedule:   z.array(DaySchema).length(7).optional(),
  hoursOverrides: z.array(OverrideSchema).max(60).optional(),
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

  const update: Record<string, unknown> = {};
  if (parsed.data.weekSchedule)   update.weekSchedule   = parsed.data.weekSchedule;
  if (parsed.data.hoursOverrides) update.hoursOverrides = parsed.data.hoursOverrides;

  await Center.findByIdAndUpdate(centerId, { $set: update });

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.SETTING_CHANGE,
    resourceType: "Center",
    resourceId:   session.user.centerId,
    metadata:     { section: "hours", ...update },
  });

  return NextResponse.json({ message: "Operating hours updated" });
}
