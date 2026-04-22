import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { connectDB, Appointment, VaccinationRecord, QueueToken, Inventory } from "@/lib/db";
import { KPIRow } from "@/components/features/dashboard/KPIRow";
import { QueueWidget } from "@/components/features/dashboard/QueueWidget";
import { InventoryPanel } from "@/components/features/dashboard/InventoryPanel";
import { FraudFeed } from "@/components/features/dashboard/FraudFeed";
import { StaffOnShift } from "@/components/features/dashboard/StaffOnShift";
import { QuickActions } from "@/components/features/dashboard/QuickActions";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function yesterdayStr() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function WorkerDashboardPage() {
  const session = await auth();
  if (!session?.user?.centerId) redirect("/login");

  const centerId = session.user.centerId;
  const today = todayStr();
  const yesterday = yesterdayStr();

  await connectDB();

  const [
    totalToday, totalYesterday,
    completedToday, completedYesterday,
    walkinsToday, walkinsYesterday,
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
    Inventory.find({ centerId }).select("vaccineType quantity threshold batchNo expiryDate").lean(),
  ]);

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

  const kpis = {
    totalAppointments: { today: totalToday, yesterday: totalYesterday },
    completed: { today: completedToday, yesterday: completedYesterday },
    walkins: { today: walkinsToday, yesterday: walkinsYesterday },
    slotsRemaining: { today: slotsRemaining, yesterday: slotsRemainingYesterday },
  };

  const dateLabel = new Date().toLocaleDateString("en-BD", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
      </div>

      {/* KPI row — server-rendered initial data */}
      <KPIRow {...kpis} />

      {/* Quick actions */}
      <QuickActions />

      {/* Middle row: Queue + Fraud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueueWidget />
        <FraudFeed />
      </div>

      {/* Bottom row: Inventory + Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InventoryPanel items={inventoryItems} />
        <StaffOnShift />
      </div>
    </div>
  );
}
