// app/api/worker/audit/log/route.ts
// GET  /api/worker/audit/log — cursor-based paginated audit log with CSV export
// DELETE is intentionally absent — audit logs are immutable.

import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, AuditLog, User } from "@/lib/db";
import mongoose from "mongoose";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const { searchParams } = new URL(req.url);

  // ── Filters ───────────────────────────────────────────────────────────────
  const staffId  = searchParams.get("staffId") ?? "";
  const actions  = searchParams.getAll("action");
  const from     = searchParams.get("from") ?? "";
  const to       = searchParams.get("to") ?? "";
  const resource = searchParams.get("resourceType") ?? "";
  const patientId = searchParams.get("patientId") ?? "";

  // ── Cursor (ObjectId of last seen document) ───────────────────────────────
  const cursor   = searchParams.get("cursor") ?? "";
  const format   = searchParams.get("format") ?? "json"; // "json" | "csv"

  const filter: Record<string, unknown> = { centerId };

  if (staffId && mongoose.isValidObjectId(staffId))
    filter.staffId = new mongoose.Types.ObjectId(staffId);
  if (actions.length)
    filter.action = { $in: actions };
  if (resource)
    filter.resourceType = resource;
  if (from || to) {
    const dateRange: Record<string, Date> = {};
    if (from) dateRange.$gte = new Date(from);
    if (to)   dateRange.$lte = new Date(to + "T23:59:59.999Z");
    filter.createdAt = dateRange;
  }
  if (patientId)
    filter["metadata.userId"] = patientId;

  // Cursor: only return documents older than the cursor _id
  if (cursor && mongoose.isValidObjectId(cursor))
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };

  // ── CSV export (no pagination limit — streams all matching) ───────────────
  if (format === "csv") {
    const logs = await AuditLog.find(filter)
      .sort({ _id: -1 })
      .limit(10_000) // safety cap
      .populate<{ staffId: { name: string; email: string } | null }>("staffId", "name email")
      .lean();

    const header = "id,timestamp,action,resourceType,resourceId,staffName,staffEmail,ip,metadata\n";
    const rows = logs.map((l) => {
      const staff = l.staffId as unknown as { name: string; email: string } | null;
      const meta  = JSON.stringify(l.metadata ?? {}).replace(/"/g, '""');
      return [
        String(l._id),
        l.createdAt.toISOString(),
        l.action,
        l.resourceType,
        l.resourceId ? String(l.resourceId) : "",
        staff?.name  ?? "System",
        staff?.email ?? "",
        l.ip ?? "",
        `"${meta}"`,
      ].join(",");
    });

    return new Response(header + rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-${session.user.centerId}-${Date.now()}.csv"`,
      },
    });
  }

  // ── JSON cursor-based response ─────────────────────────────────────────────
  const [logs, staffList] = await Promise.all([
    AuditLog.find(filter)
      .sort({ _id: -1 })
      .limit(PAGE_SIZE + 1) // fetch one extra to determine if there's a next page
      .populate<{ staffId: { name: string } | null }>("staffId", "name")
      .lean(),
    User.find({ centerId, role: { $in: ["staff", "supervisor"] } })
      .select("name")
      .lean(),
  ]);

  const hasMore   = logs.length > PAGE_SIZE;
  const page      = hasMore ? logs.slice(0, PAGE_SIZE) : logs;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return NextResponse.json({
    logs: page.map((l) => ({
      id:           String(l._id),
      staffName:    (l.staffId as unknown as { name: string } | null)?.name ?? "System",
      staffId:      String(l.staffId),
      action:       l.action,
      resourceType: l.resourceType,
      resourceId:   l.resourceId ? String(l.resourceId) : null,
      metadata:     l.metadata,
      ip:           l.ip ?? null,
      createdAt:    l.createdAt.toISOString(),
    })),
    nextCursor,
    hasMore,
    staffList: staffList.map((s) => ({ id: String(s._id), name: s.name })),
  });
}
