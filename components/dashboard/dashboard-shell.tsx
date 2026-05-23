"use client";

import { useState } from "react";

import { CalendarPage } from "@/components/dashboard/calendar-page";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { Sidebar } from "@/components/dashboard/sidebar";

export function DashboardShell() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<"dashboard" | "calendar">(
    "dashboard"
  );

  return (
    <main className="min-h-screen bg-[var(--flow-app)] text-[var(--flow-ink)]">
      <div className="flex min-h-screen">
        <Sidebar
          activeView={activeView}
          isCollapsed={isCollapsed}
          onNavigate={setActiveView}
          onToggle={() => setIsCollapsed((current) => !current)}
        />
        {activeView === "calendar" ? (
          <CalendarPage />
        ) : (
          <DashboardHome isSidebarCollapsed={isCollapsed} />
        )}
      </div>
    </main>
  );
}
