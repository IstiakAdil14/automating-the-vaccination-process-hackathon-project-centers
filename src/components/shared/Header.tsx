"use client";

import { usePathname } from "next/navigation";
import { Bell, Wifi, WifiOff, RefreshCw, ChevronDown, User, KeyRound, LogOut } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { usePendingCount } from "@/hooks/usePendingCount";
import type { CenterRole } from "@/types/next-auth";

interface Props {
  userName: string;
  userRole: CenterRole;
  openFraudCount: number;
}

const PAGE_TITLES: Record<string, string> = {
  "/worker/dashboard":          "Dashboard",
  "/worker/queue":              "Queue Management",
  "/worker/record-vaccination": "Vaccination Recording",
  "/worker/appointments":       "Appointments",
  "/worker/inventory":          "Inventory",
  "/worker/staff":              "Staff",
  "/worker/slots":              "Slot Configuration",
  "/worker/reports":            "Reports",
  "/worker/audit":              "Audit Log",
  "/worker/settings":           "Settings",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function useLastSyncTime() {
  // Reads the last sync timestamp stored by useOfflineSync
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("vcbd_last_sync");
  if (!raw) return null;
  const d = new Date(Number(raw));
  return d.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });
}

export function Header({ userName, userRole, openFraudCount }: Props) {
  const pathname = usePathname();
  const { isOnline } = useOfflineStatus();
  const pendingCount = usePendingCount();
  const lastSync = useLastSyncTime();

  // Derive page title from pathname (handles sub-routes)
  const title = Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? "Portal";

  return (
    <header className="sticky top-0 z-20 h-16 bg-[var(--surface)] border-b border-[var(--border)] flex items-center px-4 md:px-6 gap-4">
      {/* Page title */}
      <h1 className="flex-1 text-base font-semibold text-foreground truncate">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Online / Offline indicator */}
        <div className={cn(
          "hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
          isOnline ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
        )}>
          {isOnline
            ? <Wifi className="w-3.5 h-3.5" />
            : <WifiOff className="w-3.5 h-3.5" />}
          {isOnline ? "Online" : "Offline"}
          {isOnline && lastSync && (
            <span className="text-muted-foreground ml-1">· {lastSync}</span>
          )}
        </div>

        {/* Pending sync badge */}
        {pendingCount > 0 && (
          <div className="flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{pendingCount} pending</span>
          </div>
        )}

        {/* Fraud alert bell */}
        <Link
          href="/worker/audit"
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Fraud alerts"
        >
          <Bell className="w-5 h-5" />
          {openFraudCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {openFraudCount > 9 ? "9+" : openFraudCount}
            </span>
          )}
        </Link>

        {/* Avatar dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {initials(userName)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-foreground leading-tight">{userName}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{userRole.replace("_", " ")}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[180px] rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-lg p-1 animate-scale-in"
            >
              <DropdownMenu.Item asChild>
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors cursor-pointer outline-none"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                  Profile
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/profile?tab=password"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors cursor-pointer outline-none"
                >
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  Change Password
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
              <DropdownMenu.Item asChild>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors cursor-pointer outline-none"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
