import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { connectDB, CenterApplication } from "@/lib/db";
import { Sidebar } from "@/components/shared/Sidebar";
import { SyncWorker } from "@/components/features/record-vaccination/SyncWorker";
import { OfflineTopBanner } from "@/components/features/dashboard/OfflineBanner";
import mongoose from "mongoose";

export default async function WorkerDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await connectDB();
  const app = await CenterApplication.collection.findOne(
    { _id: new mongoose.Types.ObjectId(session.user.centerId) },
    { projection: { centerName: 1 } }
  );
  const centerName = app?.centerName ?? "Your Center";

  return (
    <div className="min-h-screen bg-background">
      {/* Background sync engine — mounts once, drives all offline→online sync */}
      <SyncWorker />
      <Sidebar
        userName={session.user.name}
        userRole={session.user.role}
        centerName={centerName}
      />
      <main className="pl-sidebar">
        <OfflineTopBanner />
        <div className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
