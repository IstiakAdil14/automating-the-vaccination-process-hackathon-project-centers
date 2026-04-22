import { NextResponse } from "next/server";

// GET /api/slots — get slot configuration for this center
export async function GET() {
  return NextResponse.json({ slots: [] });
}

// POST /api/slots — configure daily slots
export async function POST() {
  return NextResponse.json({ message: "Slots updated" });
}
