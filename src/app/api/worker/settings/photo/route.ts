// POST /api/worker/settings/photo
// Accepts multipart/form-data with field "photo" (image file, max 2 MB).
// Stores as a base64 data URL in Center.photoUrl — no external storage needed.
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, Center } from "@/lib/db";
import mongoose from "mongoose";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  const formData = await req.formData();
  const file = formData.get("photo") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

  await connectDB();
  await Center.findByIdAndUpdate(
    new mongoose.Types.ObjectId(session.user.centerId),
    { $set: { photoUrl: dataUrl } }
  );

  return NextResponse.json({ message: "Photo updated", photoUrl: dataUrl });
}
