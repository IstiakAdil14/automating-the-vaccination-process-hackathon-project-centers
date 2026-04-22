// GET /api/worker/appointments/export.csv
import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Appointment } from "@/lib/db";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function csvEscape(val: unknown): string {
  const s = String(val ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export async function GET(req: NextRequest) {
  let session;
  try { session = await requireApiSession(); }
  catch (e) { return e as Response; }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const status = searchParams.get("status") || "";
  const vaccineTypes = searchParams.getAll("vaccineType");
  const shift = searchParams.get("shift") || "";

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const filter: Record<string, unknown> = { centerId, date };
  if (status) filter.status = status;
  if (vaccineTypes.length) filter.vaccineType = { $in: vaccineTypes };
  if (shift === "morning") filter.timeSlot = { $lt: "14:00" };
  if (shift === "evening") filter.timeSlot = { $gte: "14:00" };

  const docs = await Appointment.find(filter)
    .populate<{ userId: { name: string; phone?: string; nid?: string } }>("userId", "name phone nid")
    .sort({ timeSlot: 1 })
    .lean();

  const headers = ["Booking ID", "Date", "Time Slot", "Vaccine Type", "Status", "Checked In", "Walk-in", "Notes"];
  const rows = docs.map((a) => [
    String(a._id),
    a.date,
    a.timeSlot,
    a.vaccineType,
    a.status,
    a.checkedIn ? "Yes" : "No",
    a.walkin ? "Yes" : "No",
    a.notes ?? "",
  ]);

  const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="appointments-${date}.csv"`,
    },
  });
}
