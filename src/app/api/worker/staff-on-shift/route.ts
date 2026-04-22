import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, User } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const centerId = session.user.centerId;
  await connectDB();

  const staff = await User.find({
    centerId,
    role: { $in: ["staff", "supervisor"] },
    isActive: true,
  })
    .select("name role lastLogin")
    .lean();

  // Treat staff who logged in within the last 12h as "on shift"
  const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const onShift = staff
    .filter((s) => s.lastLogin && s.lastLogin > cutoff)
    .map((s) => ({
      id: String(s._id),
      name: s.name,
      role: s.role === "supervisor" ? "center_manager" : "staff",
      lastLogin: s.lastLogin!.toISOString(),
      // Shift end = lastLogin + 8h
      shiftEnd: new Date(s.lastLogin!.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    }));

  return NextResponse.json({ staff: onShift });
}
