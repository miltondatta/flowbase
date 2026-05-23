import {
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileText,
  Grid2X2,
  LayoutDashboard,
  LibraryBig,
  Palette,
  Settings,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

const menuGroups = [
  {
    label: "Workbench",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        color: "text-sky-500",
        bg: "bg-sky-50",
        active: true,
      },
      {
        label: "AI Assistant",
        icon: Bot,
        color: "text-violet-500",
        bg: "bg-violet-50",
      },
      {
        label: "Calendar",
        icon: CalendarDays,
        color: "text-emerald-500",
        bg: "bg-emerald-50",
      },
    ],
  },
  {
    label: "Create",
    items: [
      {
        label: "Task / Kanban",
        icon: Columns3,
        color: "text-orange-500",
        bg: "bg-orange-50",
      },
      {
        label: "Notes",
        icon: FileText,
        color: "text-amber-500",
        bg: "bg-amber-50",
      },
      {
        label: "Whiteboard",
        icon: Palette,
        color: "text-rose-500",
        bg: "bg-rose-50",
      },
    ],
  },
  {
    label: "Organize",
    items: [
      {
        label: "Pages / Spaces",
        icon: LibraryBig,
        color: "text-teal-500",
        bg: "bg-teal-50",
      },
      {
        label: "AI Template Builder",
        icon: Sparkles,
        color: "text-fuchsia-500",
        bg: "bg-fuchsia-50",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        icon: Settings,
        color: "text-slate-500",
        bg: "bg-slate-100",
      },
    ],
  },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-[var(--flow-border)] bg-[var(--flow-sidebar)] px-3 py-4 shadow-[10px_0_30px_rgba(47,61,84,0.05)] transition-[width] duration-300 ease-out",
        isCollapsed ? "w-[76px]" : "w-[246px]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-1",
          isCollapsed && "justify-center"
        )}
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,#68d8bd,#54a8ff_52%,#ff8c67)] shadow-[0_10px_24px_rgba(84,168,255,0.22)]">
          <Grid2X2 className="h-5 w-5 text-white" strokeWidth={2.4} />
        </div>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-5 text-[var(--flow-ink)]">
              Flowbase
            </p>
            <p className="text-[11px] font-medium leading-4 text-[var(--flow-muted)]">
              Creative workspace
            </p>
          </div>
        )}
      </div>

      <nav className="mt-6 flex-1 space-y-5 overflow-y-auto pr-1">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {!isCollapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-[var(--flow-soft)]">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    className={cn(
                      "group flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] font-medium text-[var(--flow-muted)] transition hover:bg-white hover:text-[var(--flow-ink)] hover:shadow-[0_8px_22px_rgba(47,61,84,0.07)]",
                      item.active &&
                        "bg-white text-[var(--flow-ink)] shadow-[0_8px_24px_rgba(47,61,84,0.08)]",
                      isCollapsed && "justify-center px-0"
                    )}
                    key={item.label}
                    title={isCollapsed ? item.label : undefined}
                    type="button"
                  >
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                        item.bg
                      )}
                    >
                      <Icon className={cn("h-4 w-4", item.color)} />
                    </span>
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--flow-border)] pt-3">
        <div
          className={cn(
            "mb-3 flex items-center gap-3 rounded-lg bg-[var(--flow-panel)] p-2",
            isCollapsed && "justify-center"
          )}
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-coral-100 text-[12px] font-semibold text-coral-700">
            FB
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-[var(--flow-ink)]">
                Flow Studio
              </p>
              <p className="truncate text-[11px] text-[var(--flow-muted)]">
                Personal space
              </p>
            </div>
          )}
        </div>
        <button
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[var(--flow-border)] bg-white text-[12px] font-semibold text-[var(--flow-muted)] transition hover:border-[var(--flow-mint)] hover:text-[var(--flow-ink)]",
            isCollapsed && "w-10"
          )}
          onClick={onToggle}
          type="button"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
