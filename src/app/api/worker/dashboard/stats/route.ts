import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { connectDB, Appointment, VaccinationRecord, QueueToken, Inventory } from "@/lib/db";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.centerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const centerId = session.user.centerId;
  const today = todayStr();
  const yesterday = yesterdayStr();

  await connectDB();

  const [
    totalToday,
    totalYesterday,
    completedToday,
    completedYesterday,
    walkinsToday,
    walkinsYesterday,
    queueWaiting,
    inventory,
  ] = await Promise.all([
    Appointment.countDocuments({ centerId, date: today }),
    Appointment.countDocuments({ centerId, date: yesterday }),
    VaccinationRecord.countDocuments({
      centerId,
      createdAt: { $gte: new Date(today), $lt: new Date(today + "T23:59:59Z") },
    }),
    VaccinationRecord.countDocuments({
      centerId,
      createdAt: { $gte: new Date(yesterday), $lt: new Date(yesterday + "T23:59:59Z") },
    }),
    Appointment.countDocuments({ centerId, date: today, walkin: true }),
    Appointment.countDocuments({ centerId, date: yesterday, walkin: true }),
    QueueToken.countDocuments({ centerId, date: today, status: "waiting" }),
    Inventory.find({ centerId }).select("vaccineType quantity threshold batchNo expiryDate").lean(),
  ]);

  // Capacity from center — approximate slots remaining as total - completed
  const slotsRemaining = Math.max(0, totalToday - completedToday);
  const slotsRemainingYesterday = Math.max(0, totalYesterday - completedYesterday);

  const inventoryItems = inventory.map((i) => ({
    id: String(i._id),
    vaccineType: i.vaccineType,
    quantity: i.quantity,
    threshold: i.threshold,
    batchNo: i.batchNo,
    expiryDate: i.expiryDate.toISOString(),
    isLowStock: i.quantity <= i.threshold,
    isCritical: i.quantity <= 5,
  }));

  return NextResponse.json({
    kpis: {
      totalAppointments: { today: totalToday, yesterday: totalYesterday },
      completed: { today: completedToday, yesterday: completedYesterday },
      walkins: { today: walkinsToday, yesterday: walkinsYesterday },
      slotsRemaining: { today: slotsRemaining, yesterday: slotsRemainingYesterday },
    },
    queueLength: queueWaiting,
    inventory: inventoryItems,
  });
}
