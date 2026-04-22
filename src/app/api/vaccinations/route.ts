import { NextResponse } from "next/server";

// GET /api/vaccinations — list vaccination records for this center
export async function GET() {
  return NextResponse.json({ records: [] });
}

// POST /api/vaccinations — record a new vaccination
export async function POST() {
  return NextResponse.json({ message: "Vaccination recorded" });
}
