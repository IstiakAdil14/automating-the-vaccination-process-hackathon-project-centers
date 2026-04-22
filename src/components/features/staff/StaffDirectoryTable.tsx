"use client";

import { cn } from "@/lib/utils/cn";
import type { StaffRow } from "./StaffClient";

interface Props {
  staff: StaffRow[];
  onRowClick: (id: string) => void;
}

export function StaffDirectoryTable({ staff, onRowClick }: Props) {
  if (staff.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
        No staff assigned to this center yet.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Name", "Role", "Contact", "Status", "Shifts This Week", "Joined"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => {
              const totalShifts = Object.values(s.weekShifts).flat().length;
              return (
                <tr
                  key={s.id}
                  onClick={() => onRowClick(s.id)}
                  className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      s.role === "center_manager"
                        ? "bg-accent/20 text-accent"
                        : "bg-primary/20 text-primary"
                    )}>
                      {s.role === "center_manager" ? "Manager" : "Staff"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{s.email}</div>
                    {s.phone && <div className="text-xs">{s.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      s.isActive ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                    )}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {totalShifts > 0 ? `${totalShifts} shift${totalShifts !== 1 ? "s" : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
