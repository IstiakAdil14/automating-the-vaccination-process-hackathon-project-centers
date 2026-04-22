import { cn } from "@/lib/utils/cn";

const STYLES: Record<string, string> = {
  pending:     "bg-muted text-muted-foreground",
  confirmed:   "bg-primary/10 text-primary",
  completed:   "bg-accent/10 text-accent-foreground",
  no_show:     "bg-danger-subtle text-danger-foreground",
  cancelled:   "bg-danger-subtle text-danger-foreground",
  rescheduled: "bg-warning-subtle text-warning-foreground",
};

const LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  no_show: "No-Show",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {LABELS[status] ?? status}
    </span>
  );
}
