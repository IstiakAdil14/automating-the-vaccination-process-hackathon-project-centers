import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { QueueManager } from "@/components/features/queue/QueueManager";

export const metadata = { title: "Queue Management — VaccinationBD Centers" };

export default async function WorkerQueuePage() {
  const session = await auth();
  if (!session?.user?.centerId) redirect("/login");

  const dateLabel = new Date().toLocaleDateString("en-BD", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Queue Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
      </div>
      <QueueManager />
    </div>
  );
}
