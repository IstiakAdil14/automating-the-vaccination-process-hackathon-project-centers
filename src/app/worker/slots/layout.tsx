import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { connectDB, Center } from "@/lib/db";
import { Sidebar } from "@/components/shared/Sidebar";

export default async function WorkerSlotsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "center_manager") redirect("/worker/dashboard");

  await connectDB();
  const center = await Center.findById(session.user.centerId).select("name").lean();
  const centerName = center?.name ?? "Your Center";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userName={session.user.name}
        userRole={session.user.role}
        centerName={centerName}
      />
      <main className="pl-sidebar">
        <div className="max-w-7xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
