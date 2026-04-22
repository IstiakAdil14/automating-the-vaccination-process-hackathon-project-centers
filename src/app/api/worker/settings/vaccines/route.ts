// PATCH /api/worker/settings/vaccines
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Center } from "@/lib/db";
import { VACCINE_TYPES } from "@/lib/constants";
import mongoose from "mongoose";
import { z } from "zod";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

const schema = z.object({
  vaccines: z.array(z.enum(VACCINE_TYPES)).min(1, "At least one vaccine must be selected"),
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

  const before = await Center.findById(centerId).select("vaccines").lean();
  await Center.findByIdAndUpdate(centerId, { $set: { vaccines: parsed.data.vaccines } });

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.SETTING_CHANGE,
    resourceType: "Center",
    resourceId:   session.user.centerId,
    metadata:     { section: "vaccines", before: before?.vaccines, after: parsed.data.vaccines },
  });

  return NextResponse.json({ message: "Vaccine list updated" });
}
