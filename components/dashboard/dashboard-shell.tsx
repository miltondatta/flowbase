"use client";

import { useState } from "react";

import { CalendarPage } from "@/components/dashboard/calendar-page";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { KanbanPage } from "@/components/dashboard/kanban-page";
import { NotesPage } from "@/components/dashboard/notes-page";
import { Sidebar } from "@/components/dashboard/sidebar";

type DashboardView = "dashboard" | "calendar" | "kanban" | "notes";

export function DashboardShell() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>("dashboard");

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
        ) : activeView === "kanban" ? (
          <KanbanPage />
        ) : activeView === "notes" ? (
          <NotesPage />
        ) : (
          <DashboardHome isSidebarCollapsed={isCollapsed} />
        )}
      </div>
    </main>
  );
}
