"use client";

import { useState } from "react";

import { CalendarPage } from "@/components/dashboard/calendar-page";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { KanbanPage } from "@/components/dashboard/kanban-page";
import { NotesPage } from "@/components/dashboard/notes-page";
import { Sidebar } from "@/components/dashboard/sidebar";
import WhiteboardSidebar from "@/components/whiteboard/whiteboard-sidebar";
import WhiteboardCanvas from "@/components/whiteboard/whiteboard-canvas";

type DashboardView = "dashboard" | "calendar" | "kanban" | "notes" | "whiteboard";

export function DashboardShell() {
  const [isCollapsed, setIsCollapsed] = useState(false);
   const [activeView, setActiveView] = useState<DashboardView>("dashboard");
   const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[var(--flow-app)] text-[var(--flow-ink)]">
      <div className="flex min-h-screen">
        <Sidebar
          activeView={activeView}
          isCollapsed={isCollapsed}
          onNavigate={setActiveView}
          onToggle={() => setIsCollapsed((current) => !current)}
        />
        <div className="flex flex-1 min-h-screen overflow-hidden">
          {activeView === "whiteboard" && (
            <div className="w-[260px] border-r border-[var(--flow-border)]">
              <WhiteboardSidebar 
                selectedId={selectedBoardId} 
                onSelect={setSelectedBoardId} 
              />
            </div>
          )}

          <div className="flex-1 h-full overflow-hidden">
            {activeView === "whiteboard" ? (
               <WhiteboardCanvas whiteboardId={selectedBoardId} />
            ) : activeView === "calendar" ? (
              <CalendarPage />
            ) : activeView === "kanban" ? (
              <KanbanPage />
            ) : activeView === "notes" ? (
              <NotesPage />
            ) : (
              <DashboardHome isSidebarCollapsed={isCollapsed} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
