// app/api/worker/audit/auth-event/route.ts
// Internal-only route called by middleware (Edge) to persist auth audit events.
// Protected by AUDIT_INTERNAL_SECRET — rejects all external callers.

import { NextRequest, NextResponse } from "next/server";
import { connectDB, AuditLog } from "@/lib/db";

export async function POST(req: NextRequest) {
  // Verify internal secret
  const secret = req.headers.get("x-audit-secret");
  if (!secret || secret !== process.env.AUDIT_INTERNAL_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { action, metadata, timestamp } = body as {
    action: string;
    metadata: Record<string, unknown>;
    timestamp: string;
  };

  // Auth events may not have a staffId/centerId (e.g. failed login before session exists).
  // We store what we have; staffId/centerId come from metadata when available.
  const ip        = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  await connectDB();

  // Use a sentinel ObjectId for anonymous/pre-auth events
  const ANONYMOUS = "000000000000000000000000";

  await AuditLog.create({
    centerId:     metadata.centerId ?? ANONYMOUS,
    staffId:      metadata.staffId  ?? ANONYMOUS,
    action,
    resourceType: "User",
    metadata:     { ...metadata, _occurredAt: timestamp },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true });
}
