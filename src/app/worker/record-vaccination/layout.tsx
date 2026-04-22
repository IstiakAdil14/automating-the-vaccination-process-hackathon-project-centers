// app/worker/record-vaccination/layout.tsx
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { connectDB, Center } from "@/lib/db";
import { Sidebar } from "@/components/shared/Sidebar";
import { SyncWorker } from "@/components/features/record-vaccination/SyncWorker";

export default async function RecordVaccinationLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await connectDB();
  const center = await Center.findById(session.user.centerId).select("name").lean();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userName={session.user.name}
        userRole={session.user.role}
        centerName={center?.name ?? "Your Center"}
      />
      <main className="pl-sidebar">
        <div className="max-w-5xl mx-auto px-6 py-6">{children}</div>
      </main>
      <SyncWorker />
    </div>
  );
}
