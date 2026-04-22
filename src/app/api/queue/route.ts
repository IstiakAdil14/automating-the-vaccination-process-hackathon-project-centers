import { NextResponse } from "next/server";

// GET /api/queue — fetch today's queue for the center
export async function GET() {
  return NextResponse.json({ queue: [] });
}

// POST /api/queue — add walk-in to queue
export async function POST() {
  return NextResponse.json({ message: "Added to queue" });
}
