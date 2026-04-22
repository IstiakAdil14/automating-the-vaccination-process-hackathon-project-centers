// GET /api/worker/audit/log/export.csv
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, AuditLog } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const { searchParams } = new URL(req.url);

  const staffId = searchParams.get("staffId") ?? "";
  const actions = searchParams.getAll("action");
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const filter: Record<string, unknown> = { centerId };
  if (staffId && mongoose.isValidObjectId(staffId)) {
    filter.staffId = new mongoose.Types.ObjectId(staffId);
  }
  if (actions.length > 0) filter.action = { $in: actions };
  if (from || to) {
    filter.createdAt = {} as Record<string, Date>;
    if (from) (filter.createdAt as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.createdAt as Record<string, Date>).$lte = new Date(to + "T23:59:59Z");
  }

  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(5000)
    .populate<{ staffId: { name: string } | null }>("staffId", "name")
    .lean();

  const header = "Timestamp,Staff,Action,Resource Type,Resource ID,IP\n";
  const rows = logs.map((l) => {
    const staff = (l.staffId as unknown as { name: string } | null)?.name ?? "System";
    const ts = new Date(l.createdAt).toISOString();
    const rid = l.resourceId ? String(l.resourceId) : "";
    const ip = l.ip ?? "";
    // Escape commas in fields
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [esc(ts), esc(staff), esc(l.action), esc(l.resourceType), esc(rid), esc(ip)].join(",");
  });

  const csv = header + rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
