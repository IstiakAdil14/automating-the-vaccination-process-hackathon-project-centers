// app/api/worker/slots/route.ts
// GET  /api/worker/slots?month=YYYY-MM  — all slot configs for a month
// POST /api/worker/slots                — upsert slot config for a date

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { connectDB, SlotConfig, Appointment } from "@/lib/db";
import { VACCINE_TYPES } from "@/lib/constants";
import mongoose from "mongoose";
import { AuditLogger, AuditAction, buildContext } from "@/lib/audit/logger";

const VaccineAllocationSchema = z.object({
  vaccineType: z.enum(VACCINE_TYPES),
  quota: z.number().int().min(0),
});

const UpsertSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    totalCapacity: z.number().int().min(1),
    morningLimit: z.number().int().min(0),
    eveningLimit: z.number().int().min(0),
    walkinQuota: z.number().int().min(0),
    vaccineAllocations: z.array(VaccineAllocationSchema).default([]),
  })
  .superRefine((d, ctx) => {
    if (d.walkinQuota > d.totalCapacity) {
      ctx.addIssue({
        code: "custom",
        path: ["walkinQuota"],
        message: "Walk-in quota cannot exceed total capacity",
      });
    }
    const totalAllocated = d.vaccineAllocations.reduce((s, a) => s + a.quota, 0);
    if (totalAllocated > d.totalCapacity) {
      ctx.addIssue({
        code: "custom",
        path: ["vaccineAllocations"],
        message: "Total vaccine allocations exceed daily capacity",
      });
    }
  });

async function requireManager() {
  const session = await auth();
  if (!session?.user || session.user.role !== "center_manager") return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const month = req.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month param required (YYYY-MM)" }, { status: 400 });
  }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const [configs, bookingCounts] = await Promise.all([
    SlotConfig.find({ centerId, date: { $regex: `^${month}` } }).lean(),
    Appointment.aggregate([
      {
        $match: {
          centerId,
          date: { $regex: `^${month}` },
          status: { $in: ["pending", "confirmed"] },
        },
      },
      { $group: { _id: "$date", count: { $sum: 1 } } },
    ]),
  ]);

  const bookingMap: Record<string, number> = {};
  for (const b of bookingCounts) bookingMap[b._id] = b.count;

  const data = configs.map((c) => ({
    id: String(c._id),
    date: c.date,
    totalCapacity: c.totalCapacity,
    morningLimit: c.morningLimit,
    eveningLimit: c.eveningLimit,
    walkinQuota: c.walkinQuota,
    vaccineAllocations: c.vaccineAllocations,
    isBlocked: c.isBlocked,
    blockReason: c.blockReason,
    blockId: c.blockId,
    booked: bookingMap[c.date] ?? 0,
  }));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (parsed.data.date < today) {
    return NextResponse.json({ error: "Cannot edit past dates" }, { status: 400 });
  }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const doc = await SlotConfig.findOneAndUpdate(
    { centerId, date: parsed.data.date },
    {
      $set: {
        ...parsed.data,
        centerId,
        isBlocked: false,
        blockReason: undefined,
        blockId: undefined,
      },
    },
    { upsert: true, new: true }
  ).lean();

  AuditLogger.log(buildContext(session as Parameters<typeof buildContext>[0], req), {
    action:       AuditAction.SLOT_CONFIG,
    resourceType: "SlotConfig",
    resourceId:   doc ? String((doc as { _id: unknown })._id) : undefined,
    metadata:     { date: parsed.data.date, totalCapacity: parsed.data.totalCapacity },
  });

  return NextResponse.json({ data: doc }, { status: 200 });
}
