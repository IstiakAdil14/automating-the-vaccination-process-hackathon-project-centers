"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PageTransition } from "./PageTransition";
import { useSidebarState } from "@/hooks/useSidebarState";
import { motion } from "framer-motion";
import type { CenterRole } from "@/types/next-auth";

interface Props {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    role: CenterRole;
    centerId: string;
  };
  centerName: string;
  centerStatus: "active" | "suspended" | "closed";
  openFraudCount: number;
}

export function LayoutShell({ children, user, centerName, centerStatus, openFraudCount }: Props) {
  const { collapsed, mounted } = useSidebarState();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        userName={user.name}
        userRole={user.role}
        centerName={centerName}
        centerStatus={centerStatus}
      />

      {/* Main content — shifts right based on sidebar width */}
      <motion.div
        animate={{ paddingLeft: mounted ? (collapsed ? "4.5rem" : "16rem") : "16rem" }}
        transition={{ type: "tween", duration: 0.22, ease: "easeInOut" }}
        // On mobile the sidebar is a bottom tab bar, so no left padding
        className="md:block flex flex-col min-h-screen pb-16 md:pb-0"
      >
        <Header
          userName={user.name}
          userRole={user.role}
          openFraudCount={openFraudCount}
        />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </motion.div>
    </div>
  );
}
