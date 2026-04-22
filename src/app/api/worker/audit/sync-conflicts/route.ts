// GET /api/worker/audit/sync-conflicts
// Returns SyncQueue entries with status "failed" — these represent offline records
// that could not be synced cleanly and need manual resolution.
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, SyncQueue, VaccinationRecord } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(_req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = session.user.centerId;

  // Failed sync entries for this center
  const conflicts = await SyncQueue.find({
    status: "failed",
    "payload.centerId": centerId,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  // For each conflict, try to find the server-side version if it exists
  const enriched = await Promise.all(
    conflicts.map(async (c) => {
      let serverVersion: Record<string, unknown> | null = null;

      if (c.recordType === "VaccinationRecord" && c.payload.userId && c.payload.vaccineType && c.payload.doseNumber) {
        const existing = await VaccinationRecord.findOne({
          userId: new mongoose.Types.ObjectId(String(c.payload.userId)),
          vaccineType: c.payload.vaccineType,
          doseNumber: c.payload.doseNumber,
          centerId: new mongoose.Types.ObjectId(centerId),
          pendingSync: false,
        })
          .select("vaccineType doseNumber batchNo adminSite createdAt staffId")
          .lean();

        if (existing) {
          serverVersion = {
            vaccineType: existing.vaccineType,
            doseNumber: existing.doseNumber,
            batchNo: existing.batchNo,
            adminSite: existing.adminSite,
            createdAt: existing.createdAt.toISOString(),
          };
        }
      }

      return {
        id: String(c._id),
        recordType: c.recordType,
        status: c.status,
        attempts: c.attempts,
        error: c.error ?? null,
        offlineVersion: c.payload,
        serverVersion,
        createdAt: c.createdAt.toISOString(),
        lastAttemptAt: c.lastAttemptAt?.toISOString() ?? null,
      };
    })
  );

  return NextResponse.json({ conflicts: enriched, total: enriched.length });
}

// POST — resolve a conflict: keep_offline | keep_server | manual_review
export async function POST(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const { id, resolution } = await req.json() as { id: string; resolution: "keep_offline" | "keep_server" | "manual_review" };

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await connectDB();

  if (resolution === "keep_server") {
    // Mark as synced — discard offline version
    await SyncQueue.findByIdAndUpdate(id, { status: "synced", syncedAt: new Date() });
  } else if (resolution === "keep_offline") {
    // Reset to pending so the sync worker retries with force flag
    await SyncQueue.findByIdAndUpdate(id, { status: "pending", attempts: 0, error: null });
  } else {
    // manual_review — mark with a special error note
    await SyncQueue.findByIdAndUpdate(id, {
      error: `Manual review requested by ${session.user.name} at ${new Date().toISOString()}`,
    });
  }

  return NextResponse.json({ message: "Conflict resolved" });
}
