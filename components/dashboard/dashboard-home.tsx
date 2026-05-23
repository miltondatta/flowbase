import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  ListTodo,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardHomeProps = {
  isSidebarCollapsed: boolean;
};

const taskItems = [
  {
    label: "Finalize launch board",
    status: "In review",
    accent: "bg-sky-100 text-sky-700",
  },
  {
    label: "Draft template gallery",
    status: "Today",
    accent: "bg-amber-100 text-amber-700",
  },
  {
    label: "Map onboarding canvas",
    status: "Next",
    accent: "bg-mint-100 text-mint-700",
  },
];

const recentPages = [
  "Product roadmap",
  "Weekly planning",
  "Meeting notes",
  "Research wall",
];

export function DashboardHome({ isSidebarCollapsed }: DashboardHomeProps) {
  return (
    <section className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5">
        <header className="flex flex-col gap-3 rounded-lg border border-[var(--flow-border)] bg-white/82 px-4 py-3 shadow-[0_14px_40px_rgba(47,61,84,0.06)] backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] font-semibold text-[var(--flow-muted)]">
              Good morning, Milton
            </p>
            <h1 className="text-[24px] font-semibold leading-8 text-[var(--flow-ink)]">
              Build your ideas into clear workspaces.
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] px-3 text-[13px] text-[var(--flow-muted)] md:w-[260px]">
              <Search className="h-4 w-4 shrink-0 text-sky-500" />
              <input
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--flow-soft)]"
                placeholder="Search pages, boards, tasks"
                type="search"
              />
            </label>
            <button
              aria-label="Notifications"
              className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--flow-border)] bg-white text-[var(--flow-muted)]"
              type="button"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              className="flex h-9 items-center gap-2 rounded-lg bg-[var(--flow-ink)] px-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(47,61,84,0.16)]"
              type="button"
            >
              <Plus className="h-4 w-4" />
              New
            </button>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5">
            <section className="rounded-lg border border-[var(--flow-border)] bg-white p-4 shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-semibold leading-7">
                    Today
                  </h2>
                  <p className="text-[13px] text-[var(--flow-muted)]">
                    Your notes, boards, and tasks in one gentle rhythm.
                  </p>
                </div>
                <button
                  className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--flow-panel)] text-[var(--flow-muted)]"
                  type="button"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <MetricTile
                  color="text-sky-600"
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Focus blocks"
                  value="4"
                />
                <MetricTile
                  color="text-mint-700"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Tasks done"
                  value="12"
                />
                <MetricTile
                  color="text-coral-700"
                  icon={<MessageSquareText className="h-4 w-4" />}
                  label="AI drafts"
                  value="7"
                />
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-lg border border-[var(--flow-border)] bg-white p-4 shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold">Task flow</h2>
                  <ListTodo className="h-4 w-4 text-orange-500" />
                </div>
                <div className="space-y-2">
                  {taskItems.map((task) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] px-3 py-2"
                      key={task.label}
                    >
                      <span className="truncate text-[13px] font-medium">
                        {task.label}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold",
                          task.accent
                        )}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--flow-border)] bg-white p-4 shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[16px] font-semibold">
                    Whiteboard snapshot
                  </h2>
                  <ArrowUpRight className="h-4 w-4 text-rose-500" />
                </div>
                <div className="relative h-[220px] overflow-hidden rounded-lg border border-[var(--flow-border)] bg-[linear-gradient(135deg,#ffffff_0%,#f3fbff_46%,#fff4ed_100%)] p-4">
                  <div className="absolute left-6 top-6 h-16 w-28 rounded-lg border border-sky-100 bg-white p-2 text-[11px] font-semibold text-sky-700 shadow-sm">
                    Ideas
                  </div>
                  <div className="absolute right-7 top-12 h-20 w-32 rounded-lg border border-mint-100 bg-white p-2 text-[11px] font-semibold text-mint-700 shadow-sm">
                    Sprint map
                  </div>
                  <div className="absolute bottom-7 left-14 h-16 w-36 rounded-lg border border-coral-100 bg-white p-2 text-[11px] font-semibold text-coral-700 shadow-sm">
                    Launch story
                  </div>
                  <div className="absolute left-[42%] top-[43%] h-2 w-2 rounded-full bg-amber-400" />
                  <div className="absolute left-[23%] top-[42%] h-px w-[40%] rotate-6 bg-sky-200" />
                  <div className="absolute left-[45%] top-[56%] h-px w-[34%] -rotate-12 bg-coral-200" />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-lg border border-[var(--flow-border)] bg-[linear-gradient(135deg,#ffffff,#effbf6)] p-4 shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-500">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold">AI workspace</h2>
                  <p className="text-[12px] text-[var(--flow-muted)]">
                    Turn rough notes into usable templates.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--flow-border)] bg-white p-3">
                <p className="text-[13px] leading-5 text-[var(--flow-muted)]">
                  Create a weekly planning space with a kanban board, meeting
                  notes, and a whiteboard for decisions.
                </p>
                <button
                  className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-mint-500 text-[13px] font-semibold text-white"
                  type="button"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate template
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-[var(--flow-border)] bg-white p-4 shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold">Recent pages</h2>
                <span className="text-[12px] font-semibold text-sky-600">
                  View all
                </span>
              </div>
              <div className="space-y-2">
                {recentPages.map((page, index) => (
                  <div
                    className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--flow-panel)]"
                    key={page}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-amber-50 text-[12px] font-semibold text-amber-600">
                      {index + 1}
                    </span>
                    <span className="text-[13px] font-medium">{page}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--flow-border)] bg-white p-4 shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-semibold">
                    Sidebar state
                  </h2>
                  <p className="text-[13px] text-[var(--flow-muted)]">
                    Currently {isSidebarCollapsed ? "collapsed" : "expanded"}.
                  </p>
                </div>
                <span className="rounded-md bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
                  Live
                </span>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] p-3">
      <div className={cn("mb-3 flex items-center gap-2", color)}>
        {icon}
        <span className="text-[12px] font-semibold">{label}</span>
      </div>
      <p className="text-[28px] font-semibold leading-8 text-[var(--flow-ink)]">
        {value}
      </p>
    </div>
  );
}
