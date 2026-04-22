// GET /api/worker/staff/requests
import { NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, StaffRequest } from "@/lib/db";
import mongoose from "mongoose";

export async function GET() {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const requests = await StaffRequest.find({ centerId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate<{ requestedBy: { name: string } }>("requestedBy", "name")
    .lean();

  return NextResponse.json({
    requests: requests.map((r) => ({
      id: String(r._id),
      requestType: r.requestType,
      reason: r.reason,
      urgency: r.urgency,
      status: r.status,
      requestedBy: (r.requestedBy as unknown as { name: string })?.name ?? "Unknown",
      reviewNote: r.reviewNote ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
