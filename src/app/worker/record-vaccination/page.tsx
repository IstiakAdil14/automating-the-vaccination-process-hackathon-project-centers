// app/worker/record-vaccination/page.tsx
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { connectDB, Inventory, Center } from "@/lib/db";
import { RecordVaccinationClient } from "@/components/features/record-vaccination/RecordVaccinationClient";

export const metadata = { title: "Record Vaccination — VaccinationBD Centers" };

export default async function RecordVaccinationPage() {
  const session = await auth();
  if (!session?.user?.centerId) redirect("/login");

  await connectDB();

  // Fetch center's available vaccines and inventory batches for the form dropdowns
  const [center, inventoryBatches] = await Promise.all([
    Center.findById(session.user.centerId).select("vaccines").lean(),
    Inventory.find({
      centerId: session.user.centerId,
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
    })
      .select("vaccineType batchNo lotNo expiryDate quantity")
      .sort({ expiryDate: 1 }) // FEFO — first expiry first
      .lean(),
  ]);

  const batches = inventoryBatches.map((b) => ({
    id: String(b._id),
    vaccineType: b.vaccineType,
    batchNo: b.batchNo,
    lotNo: (b.lotNo as string | undefined) ?? b.batchNo,
    expiryDate: (b.expiryDate as Date).toISOString(),
    quantity: b.quantity,
  }));

  return (
    <RecordVaccinationClient
      centerId={session.user.centerId}
      staffId={session.user.id}
      staffName={session.user.name}
      centerVaccines={(center?.vaccines as string[]) ?? []}
      inventoryBatches={batches}
    />
  );
}
