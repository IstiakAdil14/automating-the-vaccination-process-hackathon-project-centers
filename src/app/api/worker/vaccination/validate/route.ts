// app/api/worker/vaccination/validate/route.ts
// Runs all fraud checks before a vaccination record is saved.
// "block" results prevent save. "warn" results require explicit staff confirmation.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, User } from "@/lib/db";
import { runAllChecks } from "@/lib/fraud/detector";
import { writeFailedChecks } from "@/lib/fraud/alertWriter";
import type { VaccineType } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    userId: string;
    vaccineType: VaccineType;
    doseNumber: number;
    batchNo: string;
    qrPayload?: string;
  };

  const { userId, vaccineType, doseNumber, batchNo, qrPayload } = body;

  if (!userId || !vaccineType || !doseNumber || !batchNo)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  await connectDB();

  const patient = await User.findById(userId).select("nid isActive role").lean();
  if (!patient || patient.role !== "citizen")
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  if (!patient.isActive)
    return NextResponse.json({ error: "Patient account is suspended" }, { status: 403 });

  const nid = patient.nid ?? "";
  const centerId = session.user.centerId;
  const staffId = session.user.id;

  const output = await runAllChecks({
    userId,
    centerId,
    staffId,
    vaccineType,
    doseNumber,
    batchNo,
    nid,
    qrPayload,
  });

  // Persist alerts for any failed checks (non-blocking — don't fail the response)
  writeFailedChecks(centerId, staffId, nid, output.results).catch(() => {});

  return NextResponse.json({
    passed: output.passed,
    requiresConfirmation: output.requiresConfirmation,
    results: output.results.map(({ checkName, passed, severity, message, alertData }) => ({
      checkName,
      passed,
      severity,
      message,
      ...(alertData && !passed ? { alertData } : {}),
    })),
  });
}
