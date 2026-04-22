// GET /api/worker/appointments
import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Appointment } from "@/lib/db";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function maskName(name: string): string {
  const parts = name.trim().split(" ");
  return parts
    .map((p) => (p.length <= 2 ? p[0] + "*" : "*".repeat(p.length - 2) + p.slice(-2)))
    .join(" ");
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) return "****";
  return "*".repeat(phone.length - 4) + phone.slice(-4);
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
  const q = searchParams.get("q") || "";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = 50;

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);

  const filter: Record<string, unknown> = { centerId, date };
  if (status) filter.status = status;
  if (vaccineTypes.length) filter.vaccineType = { $in: vaccineTypes };
  if (shift === "morning") filter.timeSlot = { $lt: "14:00" };
  if (shift === "evening") filter.timeSlot = { $gte: "14:00" };

  // Populate userId to get name, phone, nid for search/masking
  let query = Appointment.find(filter)
    .populate<{ userId: { name: string; phone?: string; nid?: string } }>(
      "userId", "name phone nid"
    )
    .sort({ timeSlot: 1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize);

  const [total, docs] = await Promise.all([
    Appointment.countDocuments(filter),
    query.lean(),
  ]);

  // Apply search filter post-populate (NID last 4 or booking ref prefix)
  const filtered = q
    ? docs.filter((a) => {
        const user = a.userId as unknown as { name: string; phone?: string; nid?: string };
        const nid = user?.nid ?? "";
        const id = String(a._id);
        return (
          id.endsWith(q) ||
          nid.slice(-4) === q ||
          id.toLowerCase().includes(q.toLowerCase())
        );
      })
    : docs;

  const appointments = filtered.map((a) => {
    const user = a.userId as unknown as { name: string; phone?: string; nid?: string };
    return {
      id: String(a._id),
      patientNameMasked: maskName(user?.name ?? "Patient"),
      patientPhoneMasked: maskPhone(user?.phone ?? ""),
      patientNidLast4: (user?.nid ?? "").slice(-4),
      vaccineType: a.vaccineType,
      date: a.date,
      timeSlot: a.timeSlot,
      status: a.status,
      checkedIn: a.checkedIn,
      checkedInAt: a.checkedInAt?.toISOString() ?? null,
      walkin: a.walkin,
      notes: a.notes ?? "",
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ appointments, total, page, totalPages: Math.ceil(total / pageSize) });
}
