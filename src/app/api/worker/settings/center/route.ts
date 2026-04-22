// GET + PATCH /api/worker/settings/center
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Center } from "@/lib/db";
import mongoose from "mongoose";
import { z } from "zod";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

const schema = z.object({
  name:    z.string().min(2).max(120).optional(),
  phone:   z.string().max(20).optional(),
  email:   z.string().email().optional(),
  address: z.string().min(5).max(300).optional(),
});

export async function GET() {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const center = await Center.findById(session.user.centerId)
    .select("name phone email address division district capacity status photoUrl")
    .lean();

  if (!center) return NextResponse.json({ error: "Center not found" }, { status: 404 });
  return NextResponse.json({ center });
}

export async function PATCH(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const before = await Center.findById(centerId).select("name phone email address").lean();
  await Center.findByIdAndUpdate(centerId, { $set: parsed.data });

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.SETTING_CHANGE,
    resourceType: "Center",
    resourceId:   session.user.centerId,
    metadata:     { section: "center_info", before, after: parsed.data },
  });

  return NextResponse.json({ message: "Center info updated" });
}
