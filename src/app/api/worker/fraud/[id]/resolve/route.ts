// POST /api/worker/fraud/[id]/resolve
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, FraudAlert, AuditLog } from "@/lib/db";
import mongoose from "mongoose";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["false_positive", "escalate", "block_patient"]),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const alertId = new mongoose.Types.ObjectId(id);

  const alert = await FraudAlert.findOne({ _id: alertId, centerId });
  if (!alert) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

  const { action, note } = parsed.data;

  const newStatus =
    action === "false_positive" ? "dismissed" :
    action === "escalate" ? "investigating" :
    "investigating"; // block_patient stays investigating until admin acts

  alert.status = newStatus;
  alert.resolvedBy = new mongoose.Types.ObjectId(session.user.id);
  alert.resolvedAt = new Date();
  // Store action in context — append-only style
  alert.context = {
    ...alert.context,
    resolution: { action, note: note ?? "", resolvedBy: session.user.id, resolvedAt: new Date().toISOString() },
  };
  await alert.save();

  // Audit log — append only, never update
  await AuditLog.create({
    centerId,
    staffId: new mongoose.Types.ObjectId(session.user.id),
    action: "fraud_alert_raised", // closest existing action type
    resourceType: "FraudAlert",
    resourceId: alertId,
    metadata: { action, note: note ?? "", previousStatus: alert.status },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ message: "Alert updated", status: newStatus });
}
