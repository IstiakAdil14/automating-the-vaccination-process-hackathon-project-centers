// POST /api/worker/staff/request
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, StaffRequest } from "@/lib/db";
import mongoose from "mongoose";
import { z } from "zod";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

const schema = z.object({
  requestType: z.enum(["extra_staff", "schedule_change", "other"]),
  preferredRole: z.string().optional(),
  reason: z.string().min(10).max(1000),
  urgency: z.enum(["low", "normal", "high", "critical"]).default("normal"),
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

  await connectDB();

  const doc = await StaffRequest.create({
    centerId: new mongoose.Types.ObjectId(session.user.centerId),
    requestType: parsed.data.requestType,
    reason: parsed.data.preferredRole
      ? `[Role: ${parsed.data.preferredRole}] ${parsed.data.reason}`
      : parsed.data.reason,
    urgency: parsed.data.urgency,
    status: "pending",
    requestedBy: new mongoose.Types.ObjectId(session.user.id),
  });

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.STAFF_REQUEST,
    resourceType: "StaffRequest",
    resourceId:   String(doc._id),
    metadata:     { requestType: parsed.data.requestType, urgency: parsed.data.urgency },
  });

  return NextResponse.json({ message: "Request submitted", id: String(doc._id) }, { status: 201 });
}
