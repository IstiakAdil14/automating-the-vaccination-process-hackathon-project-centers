// PATCH /api/worker/settings/geolocation
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Center, AuditLog } from "@/lib/db";
import mongoose from "mongoose";
import { z } from "zod";

const schema = z.object({
  geoLat: z.number().min(-90).max(90),
  geoLng: z.number().min(-180).max(180),
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

  const before = await Center.findById(centerId).select("geoLat geoLng").lean();
  await Center.findByIdAndUpdate(centerId, { $set: parsed.data });

  await AuditLog.create({
    centerId,
    staffId: new mongoose.Types.ObjectId(session.user.id),
    action: "slot_configured",
    resourceType: "User",
    metadata: { section: "geolocation", before, after: parsed.data },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ message: "Location updated" });
}
