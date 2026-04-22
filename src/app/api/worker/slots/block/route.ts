// app/api/worker/slots/block/route.ts
// POST /api/worker/slots/block — block a date range (holiday / maintenance)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { connectDB, SlotConfig } from "@/lib/db";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

const BlockSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().optional(),
});

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "center_manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { startDate, endDate, reason } = parsed.data;
  if (endDate < startDate) {
    return NextResponse.json({ error: "endDate must be >= startDate" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (endDate < today) {
    return NextResponse.json({ error: "Cannot block past dates" }, { status: 400 });
  }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const blockId = randomUUID();
  const dates = dateRange(startDate, endDate).filter((d) => d >= today);

  const ops = dates.map((date) => ({
    updateOne: {
      filter: { centerId, date },
      update: {
        $set: {
          centerId,
          date,
          isBlocked: true,
          blockReason: reason ?? "",
          blockId,
          totalCapacity: 0,
          morningLimit: 0,
          eveningLimit: 0,
          walkinQuota: 0,
          vaccineAllocations: [],
        },
      },
      upsert: true,
    },
  }));

  await SlotConfig.bulkWrite(ops);

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.SLOT_BLOCK,
    resourceType: "SlotConfig",
    metadata:     { blockId, startDate, endDate, reason: reason ?? null, datesBlocked: dates.length },
  });

  return NextResponse.json({ data: { blockId, dates } }, { status: 201 });
}
