"use client";

import {
  CheckCircle2, Clock, XCircle, UserX, UserCheck,
  AlertCircle, Activity, WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type StatusType =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "noshow"
  | "no_show"
  | "pending"
  | "checkedin"
  | "active"
  | "offline"
  | "rescheduled"
  | "waiting"
  | "called"
  | "in_progress"
  | "deferred"
  | "done";

interface Config {
  label: string;
  icon: React.ElementType;
  className: string;
}

const STATUS_CONFIG: Record<string, Config> = {
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle2,
    className: "bg-primary-50 text-primary-700 border border-primary-100",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "bg-success-subtle text-success-700 border border-success-100",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    className: "bg-success-subtle text-success-700 border border-success-100",
  },
  active: {
    label: "Active",
    icon: Activity,
    className: "bg-primary-50 text-primary-700 border border-primary-100",
  },
  checkedin: {
    label: "Checked In",
    icon: UserCheck,
    className: "bg-secondary-50 text-secondary-700 border border-secondary-100",
  },
  in_progress: {
    label: "In Progress",
    icon: UserCheck,
    className: "bg-secondary-50 text-secondary-700 border border-secondary-100",
  },
  called: {
    label: "Called",
    icon: UserCheck,
    className: "bg-secondary-50 text-secondary-700 border border-secondary-100",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-muted text-muted-foreground border border-border",
  },
  waiting: {
    label: "Waiting",
    icon: Clock,
    className: "bg-muted text-muted-foreground border border-border",
  },
  rescheduled: {
    label: "Rescheduled",
    icon: AlertCircle,
    className: "bg-warning-subtle text-warning-foreground border border-warning-100",
  },
  deferred: {
    label: "Deferred",
    icon: AlertCircle,
    className: "bg-warning-subtle text-warning-foreground border border-warning-100",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-danger-subtle text-danger-foreground border border-danger-100",
  },
  noshow: {
    label: "No-Show",
    icon: UserX,
    className: "bg-danger-subtle text-danger-foreground border border-danger-100",
  },
  no_show: {
    label: "No-Show",
    icon: UserX,
    className: "bg-danger-subtle text-danger-foreground border border-danger-100",
  },
  offline: {
    label: "Offline",
    icon: WifiOff,
    className: "bg-warning-subtle text-warning-foreground border border-warning-100",
  },
};

const FALLBACK: Config = {
  label: "Unknown",
  icon: AlertCircle,
  className: "bg-muted text-muted-foreground border border-border",
};

export interface StatusBadgeProps {
  status: StatusType | string;
  /** Hide the icon */
  iconOnly?: boolean;
  /** Hide the label */
  labelOnly?: boolean;
  className?: string;
}

export function StatusBadge({ status, iconOnly, labelOnly, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? FALLBACK;
  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={config.label}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
        config.className,
        className
      )}
    >
      {!labelOnly && <Icon className="w-3 h-3 shrink-0" aria-hidden />}
      {!iconOnly && config.label}
    </span>
  );
}
