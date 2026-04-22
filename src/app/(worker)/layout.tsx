// app/(worker)/layout.tsx
// Root layout for all /worker/* routes.
// Single auth check + DB call here — no per-route layout duplication.
// Passes serialisable session/center data down to the client LayoutShell.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { connectDB, Center, FraudAlert } from "@/lib/db";
import { LayoutShell } from "@/components/shared/LayoutShell";
import { SyncWorker } from "@/components/features/record-vaccination/SyncWorker";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await connectDB();

  const [center, openFraudCount] = await Promise.all([
    Center.findById(session.user.centerId)
      .select("name status")
      .lean(),
    FraudAlert.countDocuments({
      centerId: session.user.centerId,
      status: "open",
    }),
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
      centerName={center?.name ?? "Your Center"}
      centerStatus={(center?.status as "active" | "suspended" | "closed") ?? "active"}
      openFraudCount={openFraudCount}
    >
      {/* Background sync engine — mounts once for the whole portal */}
      <SyncWorker />
      {children}
    </LayoutShell>
  );
}
