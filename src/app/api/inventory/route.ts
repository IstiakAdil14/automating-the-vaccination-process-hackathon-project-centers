import { NextResponse } from "next/server";

// GET /api/inventory — get stock levels for this center
export async function GET() {
  return NextResponse.json({ inventory: [] });
}

// POST /api/inventory — submit restock request
export async function POST() {
  return NextResponse.json({ message: "Restock request submitted" });
}
