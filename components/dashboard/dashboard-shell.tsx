"use client";

import { useState } from "react";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { Sidebar } from "@/components/dashboard/sidebar";

export function DashboardShell() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <main className="min-h-screen bg-[var(--flow-app)] text-[var(--flow-ink)]">
      <div className="flex min-h-screen">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed((current) => !current)}
        />
        <DashboardHome isSidebarCollapsed={isCollapsed} />
      </div>
    </main>
  );
}
