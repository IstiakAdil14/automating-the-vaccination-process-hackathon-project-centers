// app/(worker)/layout.tsx
// Root layout for all /worker/* routes.
// Single auth check + DB call here — no per-route layout duplication.
// Passes serialisable session/center data down to the client LayoutShell.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { connectDB, CenterApplication, FraudAlert } from "@/lib/db";
import { LayoutShell } from "@/components/shared/LayoutShell";
import { SyncWorker } from "@/components/features/record-vaccination/SyncWorker";
import mongoose from "mongoose";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();

  const [appDoc, openFraudCount] = await Promise.all([
    CenterApplication.collection.findOne(
      { _id: new mongoose.Types.ObjectId(session.user.centerId) },
      { projection: { centerName: 1, status: 1 } }
    ),
    FraudAlert.countDocuments({ centerId: session.user.centerId, status: "open" }),
  ]);

  return (
    <LayoutShell
      user={{
        id:       session.user.id,
        name:     session.user.name,
        email:    session.user.email,
        role:     session.user.role,
        centerId: session.user.centerId,
      }}
      centerName={appDoc?.centerName ?? "Your Center"}
      centerStatus="active"
      openFraudCount={openFraudCount}
    >
      <SyncWorker />
      {children}
    </LayoutShell>
  );
}
