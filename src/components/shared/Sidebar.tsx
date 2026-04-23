"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Syringe, Calendar, Package,
  UserCheck, Clock, BarChart2, Shield, Settings, LogOut,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils/cn";
import { useSidebarState } from "@/hooks/useSidebarState";
import type { CenterRole } from "@/types/next-auth";

interface Props {
  userName: string;
  userRole: CenterRole;
  centerName: string;
  centerStatus: "active" | "suspended" | "closed";
}

const NAV = [
  { label: "Dashboard",            href: "/worker/dashboard",          icon: LayoutDashboard, roles: ["staff", "center_manager"] },
  { label: "Queue",                 href: "/worker/queue",              icon: Users,           roles: ["staff", "center_manager"] },
  { label: "Vaccination Recording", href: "/worker/record-vaccination", icon: Syringe,         roles: ["staff", "center_manager"] },
  { label: "Appointments",          href: "/worker/appointments",       icon: Calendar,        roles: ["staff", "center_manager"] },
  { label: "Inventory",             href: "/worker/inventory",          icon: Package,         roles: ["center_manager"] },
  { label: "Staff",                 href: "/worker/staff",              icon: UserCheck,       roles: ["center_manager"] },
  { label: "Slots",                 href: "/worker/slots",              icon: Clock,           roles: ["center_manager"] },
  { label: "Reports",               href: "/worker/reports",            icon: BarChart2,       roles: ["center_manager"] },
  { label: "Audit Log",             href: "/worker/audit",              icon: Shield,          roles: ["center_manager"] },
  { label: "Settings",              href: "/worker/settings",           icon: Settings,        roles: ["center_manager"] },
] as const;

// Mobile bottom tab bar — 5 main items only
const MOBILE_NAV = NAV.slice(0, 5);

const STATUS_STYLES = {
  active:    "bg-success/20 text-success",
  suspended: "bg-warning/20 text-warning-foreground",
  closed:    "bg-danger/20 text-danger",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function NavItem({
  href, label, icon: Icon, active, collapsed,
}: {
  href: string; label: string; icon: React.ElementType;
  active: boolean; collapsed: boolean;
}) {
  const link = (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        collapsed ? "justify-center" : "",
        active
          ? "bg-sidebar-active-bg text-sidebar-active"
          : "text-sidebar-text hover:bg-sidebar-hover",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-lg bg-sidebar-active-bg"
          style={{ zIndex: -1 }}
          transition={{ type: "tween", duration: 0.18, ease: "easeInOut" }}
        />
      )}
      <Icon className="w-4 h-4 shrink-0" />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip.Root delayDuration={200}>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 rounded-md bg-navy-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          {label}
          <Tooltip.Arrow className="fill-navy-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function Sidebar({ userName, userRole, centerName, centerStatus }: Props) {
  const pathname = usePathname();
  const { collapsed, toggle, mounted } = useSidebarState();

  const visibleNav = NAV.filter(({ roles }) => (roles as readonly string[]).includes(userRole));

  // Avoid layout flash before localStorage is read
  if (!mounted) return null;

  return (
    <Tooltip.Provider>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? "4.5rem" : "16rem" }}
        transition={{ type: "tween", duration: 0.22, ease: "easeInOut" }}
        className="hidden md:flex fixed inset-y-0 left-0 flex-col bg-sidebar-bg border-r border-sidebar-border z-30 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Syringe className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <p className="font-bold text-white text-sm leading-tight whitespace-nowrap">VaccinationBD</p>
                <p className="text-[10px] text-sidebar-muted whitespace-nowrap">Centers Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Center info */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="px-4 py-3 border-b border-sidebar-border shrink-0 overflow-hidden"
            >
              <p className="text-[10px] text-sidebar-muted uppercase tracking-wide font-medium">Center</p>
              <p className="text-sm text-sidebar-text font-medium truncate mt-0.5">{centerName}</p>
              <span className={cn("inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize", STATUS_STYLES[centerStatus])}>
                {centerStatus}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {visibleNav.map(({ label, href, icon }) => {
            const active = pathname === href || (href !== "/worker/dashboard" && pathname.startsWith(href));
            return (
              <NavItem key={href} href={href} label={label} icon={icon} active={active} collapsed={collapsed} />
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="px-2 py-3 border-t border-sidebar-border shrink-0 space-y-1">
          <div className={cn("flex items-center gap-3 px-2 py-2", collapsed && "justify-center")}>
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {initials(userName)}
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-medium text-white truncate whitespace-nowrap">{userName}</p>
                  <p className="text-xs text-sidebar-muted capitalize whitespace-nowrap">{userRole.replace("_", " ")}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Tooltip.Root delayDuration={200}>
            <Tooltip.Trigger asChild>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-muted hover:text-white hover:bg-sidebar-hover transition-colors",
                  collapsed && "justify-center",
                )}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Sign out
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </Tooltip.Trigger>
            {collapsed && (
              <Tooltip.Portal>
                <Tooltip.Content side="right" sideOffset={8} className="z-50 rounded-md bg-navy-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
                  Sign out
                  <Tooltip.Arrow className="fill-navy-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            )}
          </Tooltip.Root>
        </div>
      </motion.aside>

      {/* Collapse toggle — outside aside so it never gets clipped by overflow-hidden */}
      <motion.div
        className="hidden md:block fixed z-40"
        style={{ top: "4.5rem" }}
        animate={{ left: collapsed ? "calc(4.5rem - 0.75rem)" : "calc(16rem - 0.75rem)" }}
        transition={{ type: "tween", duration: 0.22, ease: "easeInOut" }}
      >
        <button
          onClick={toggle}
          className="w-6 h-6 rounded-full bg-sidebar-bg border border-sidebar-border flex items-center justify-center text-sidebar-muted hover:text-white transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.div>

      {/* ── Mobile bottom tab bar ────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar-bg border-t border-sidebar-border flex">
        {MOBILE_NAV.filter(({ roles }) => (roles as readonly string[]).includes(userRole)).map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/worker/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-sidebar-muted",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-[4rem] text-center">{label}</span>
            </Link>
          );
        })}
      </nav>
    </Tooltip.Provider>
  );
}
