import { requireManagerSession } from "@/lib/auth/getServerSession";
import { connectDB, Center } from "@/lib/db";
import { Sidebar } from "@/components/shared/Sidebar";

export default async function WorkerSettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireManagerSession();
  await connectDB();
  const center = await Center.findById(session.user.centerId).select("name").lean();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar userName={session.user.name} userRole={session.user.role} centerName={center?.name ?? "Your Center"} />
      <main className="pl-sidebar">
        <div className="max-w-4xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
