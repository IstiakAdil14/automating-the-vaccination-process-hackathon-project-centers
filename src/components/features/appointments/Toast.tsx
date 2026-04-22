"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  message: string;
  type: "success" | "error";
}

export function Toast({ message, type }: Props) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-up max-w-sm",
      type === "success"
        ? "bg-accent/10 border-accent/30 text-accent-foreground"
        : "bg-danger/10 border-danger/30 text-danger-foreground"
    )}>
      {type === "success"
        ? <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
        : <XCircle className="w-4 h-4 text-danger shrink-0" />
      }
      {message}
    </div>
  );
}
