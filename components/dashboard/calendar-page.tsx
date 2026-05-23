"use client";

import { useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  Layers3,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type CalendarTask = {
  id: number;
  title: string;
  type: "task" | "reminder";
  category: string;
  categoryColor: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  notes: string | null;
  status: string;
};

type CalendarMode = "month" | "week";

type TaskForm = {
  title: string;
  type: "task" | "reminder";
  category: string;
  categoryColor: string;
  scheduledDate: string;
  scheduledTime: string;
  notes: string;
};

const categories = [
  { label: "Planning", color: "#54a8ff" },
  { label: "Focus", color: "#68d8bd" },
  { label: "Reminder", color: "#f4b942" },
  { label: "Personal", color: "#9b8cff" },
  { label: "Urgent", color: "#ff8c67" },
];

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const initialForm = (date: string): TaskForm => ({
  title: "",
  type: "task",
  category: categories[0].label,
  categoryColor: categories[0].color,
  scheduledDate: date,
  scheduledTime: "",
  notes: "",
});

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setDate(date.getDate() - date.getDay());
  next.setHours(0, 0, 0, 0);

  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);

  return next;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getMonthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(first);

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function getWeekDays(date: Date) {
  const weekStart = startOfWeek(date);

  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursorDate, setCursorDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<TaskForm>(() => initialForm(todayKey));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/calendar/tasks", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Sign in to load your calendar tasks.");
        }

        const data = (await response.json()) as { tasks: CalendarTask[] };

        if (isMounted) {
          setTasks(data.tasks);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load calendar tasks."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleDays = useMemo(
    () => (mode === "month" ? getMonthDays(cursorDate) : getWeekDays(cursorDate)),
    [cursorDate, mode]
  );

  const monthLabel = cursorDate.toLocaleDateString("en", {
    month: "long",
    year: "numeric",
  });

  const selectedDateLabel = fromDateKey(selectedDate).toLocaleDateString("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const drafts = tasks.filter((task) => !task.scheduledDate);
  const scheduledTasks = tasks.filter((task) => task.scheduledDate);

  function openTaskDialog(dateKey = selectedDate, saveAsDraft = false) {
    const nextForm = initialForm(dateKey);

    setForm({
      ...nextForm,
      scheduledDate: saveAsDraft ? "" : dateKey,
    });
    setIsDialogOpen(true);
  }

  async function saveTask(asDraft = false) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/calendar/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          scheduledDate: asDraft ? null : form.scheduledDate || selectedDate,
          scheduledTime: asDraft ? null : form.scheduledTime || null,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to save task.");
      }

      const data = (await response.json()) as { task: CalendarTask };
      setTasks((current) => [data.task, ...current]);
      setIsDialogOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save task."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveTask(false);
  }

  async function moveTask(taskId: number, scheduledDate: string | null) {
    setError(null);

    const previousTasks = tasks;
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              scheduledDate,
              scheduledTime: scheduledDate ? task.scheduledTime : null,
              status: scheduledDate ? "scheduled" : "draft",
            }
          : task
      )
    );

    try {
      const response = await fetch(`/api/calendar/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledDate,
          scheduledTime: scheduledDate
            ? previousTasks.find((task) => task.id === taskId)?.scheduledTime
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to reschedule task.");
      }

      const data = (await response.json()) as { task: CalendarTask };
      setTasks((current) =>
        current.map((task) => (task.id === taskId ? data.task : task))
      );
    } catch (moveError) {
      setTasks(previousTasks);
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Unable to reschedule task."
      );
    }
  }

  function setDragData(event: DragEvent, taskId: number) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(taskId));
  }

  function getDraggedTaskId(event: DragEvent) {
    const taskId = Number(event.dataTransfer.getData("text/plain"));

    return Number.isInteger(taskId) ? taskId : null;
  }

  function handleDrop(event: DragEvent, dateKey: string) {
    event.preventDefault();
    const taskId = getDraggedTaskId(event);

    if (taskId) {
      moveTask(taskId, dateKey);
    }
  }

  function handleDraftDrop(event: DragEvent) {
    event.preventDefault();
    const taskId = getDraggedTaskId(event);

    if (taskId) {
      moveTask(taskId, null);
    }
  }

  function moveCursor(direction: -1 | 1) {
    setCursorDate((current) =>
      mode === "month" ? addMonths(current, direction) : addDays(current, 7 * direction)
    );
  }

  return (
    <section className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <header className="flex flex-col gap-3 rounded-lg border border-[var(--flow-border)] bg-white/85 px-4 py-3 shadow-[0_14px_40px_rgba(47,61,84,0.06)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--flow-muted)]">
              <CalendarDays className="h-4 w-4 text-emerald-500" />
              Calendar
            </p>
            <h1 className="truncate text-[24px] font-semibold leading-8 text-[var(--flow-ink)]">
              {monthLabel}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] p-1">
              <button
                aria-label="Previous"
                className="grid h-7 w-7 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-white hover:text-[var(--flow-ink)]"
                onClick={() => moveCursor(-1)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                aria-label="Next"
                className="grid h-7 w-7 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-white hover:text-[var(--flow-ink)]"
                onClick={() => moveCursor(1)}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex h-9 rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] p-1">
              {(["month", "week"] as CalendarMode[]).map((viewMode) => (
                <button
                  className={cn(
                    "h-7 rounded-md px-3 text-[12px] font-semibold capitalize text-[var(--flow-muted)] transition",
                    mode === viewMode &&
                      "bg-white text-[var(--flow-ink)] shadow-[0_6px_16px_rgba(47,61,84,0.08)]"
                  )}
                  key={viewMode}
                  onClick={() => setMode(viewMode)}
                  type="button"
                >
                  {viewMode}
                </button>
              ))}
            </div>
            <button
              className="flex h-9 items-center gap-2 rounded-lg bg-[var(--flow-ink)] px-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(47,61,84,0.16)]"
              onClick={() => openTaskDialog()}
              type="button"
            >
              <Plus className="h-4 w-4" />
              New task
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-coral-100 bg-coral-50 px-4 py-3 text-[13px] font-medium text-coral-700">
            {error}
          </div>
        )}

        <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="min-w-0 overflow-hidden rounded-lg border border-[var(--flow-border)] bg-white shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
            <div className="flex flex-col gap-2 border-b border-[var(--flow-border)] px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-[16px] font-semibold">
                  {mode === "month" ? "Month view" : "Week view"}
                </h2>
                <p className="text-[12px] text-[var(--flow-muted)]">
                  Selected: {selectedDateLabel}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[var(--flow-muted)]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--flow-sky)]" />
                  Task
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[var(--flow-amber)]" />
                  Reminder
                </span>
              </div>
            </div>

            <div className="min-w-0 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-7 border-b border-[var(--flow-border)] bg-[var(--flow-panel)]">
                  {weekdays.map((day) => (
                    <div
                      className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--flow-soft)]"
                      key={day}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div
                  className={cn(
                    "grid grid-cols-7",
                    mode === "month" ? "auto-rows-[132px]" : "auto-rows-[520px]"
                  )}
                >
                  {visibleDays.map((date) => {
                    const dateKey = toDateKey(date);
                    const dayTasks = scheduledTasks.filter(
                      (task) => task.scheduledDate === dateKey
                    );
                    const isOutsideMonth =
                      mode === "month" &&
                      date.getMonth() !== cursorDate.getMonth();
                    const isSelected = selectedDate === dateKey;

                    return (
                      <div
                        className={cn(
                          "group min-w-0 border-b border-r border-[var(--flow-border)] bg-white p-2 transition hover:bg-[#fffdf8]",
                          isOutsideMonth && "bg-[var(--flow-panel)]/55",
                          isSelected && "shadow-[inset_0_0_0_2px_#68d8bd]"
                        )}
                        key={dateKey}
                        onClick={() => setSelectedDate(dateKey)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => handleDrop(event, dateKey)}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <button
                            className={cn(
                              "grid h-7 w-7 place-items-center rounded-md text-[12px] font-semibold text-[var(--flow-muted)]",
                              dateKey === todayKey &&
                                "bg-[var(--flow-ink)] text-white",
                              isSelected &&
                                dateKey !== todayKey &&
                                "bg-mint-100 text-mint-700"
                            )}
                            type="button"
                          >
                            {date.getDate()}
                          </button>
                          <button
                            aria-label={`Add task on ${dateKey}`}
                            className="grid h-7 w-7 place-items-center rounded-md text-[var(--flow-muted)] opacity-0 transition hover:bg-[var(--flow-panel)] hover:text-[var(--flow-ink)] group-hover:opacity-100"
                            onClick={(event) => {
                              event.stopPropagation();
                              openTaskDialog(dateKey);
                            }}
                            type="button"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {dayTasks.slice(0, mode === "month" ? 3 : 9).map((task) => (
                            <TaskChip
                              key={task.id}
                              onDragStart={setDragData}
                              task={task}
                            />
                          ))}
                          {dayTasks.length > (mode === "month" ? 3 : 9) && (
                            <p className="text-[11px] font-semibold text-[var(--flow-muted)]">
                              +{dayTasks.length - (mode === "month" ? 3 : 9)} more
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <aside
            className="rounded-lg border border-[var(--flow-border)] bg-white p-4 shadow-[0_14px_40px_rgba(47,61,84,0.06)]"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDraftDrop}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold">Draft Task Panel</h2>
                <p className="text-[12px] text-[var(--flow-muted)]">
                  Save ideas here, then drag them onto a date.
                </p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-mint-100 text-mint-700">
                <Layers3 className="h-4 w-4" />
              </span>
            </div>

            <button
              className="mb-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--flow-border)] bg-[var(--flow-panel)] text-[13px] font-semibold text-[var(--flow-muted)] transition hover:border-[var(--flow-mint)] hover:text-[var(--flow-ink)]"
              onClick={() => openTaskDialog(selectedDate, true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Add draft
            </button>

            <div className="space-y-2">
              {isLoading ? (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--flow-panel)] px-3 py-3 text-[13px] text-[var(--flow-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading tasks
                </div>
              ) : drafts.length > 0 ? (
                drafts.map((task) => (
                  <DraftCard
                    key={task.id}
                    onDragStart={setDragData}
                    task={task}
                  />
                ))
              ) : (
                <div className="rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] px-3 py-4 text-center">
                  <Sparkles className="mx-auto mb-2 h-5 w-5 text-violet-500" />
                  <p className="text-[13px] font-semibold">No drafts waiting</p>
                  <p className="text-[12px] text-[var(--flow-muted)]">
                    Save an unscheduled task to keep it close.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(32,42,57,0.24)] px-4 py-6 backdrop-blur-sm">
          <form
            className="w-full max-w-[560px] rounded-lg border border-[var(--flow-border)] bg-white p-4 shadow-[0_24px_70px_rgba(47,61,84,0.22)]"
            onSubmit={(event) => createTask(event)}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold">New task</h2>
                <p className="text-[13px] text-[var(--flow-muted)]">
                  Add a task or reminder with a clear category color.
                </p>
              </div>
              <button
                aria-label="Close dialog"
                className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--flow-panel)] text-[var(--flow-muted)]"
                onClick={() => setIsDialogOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                Title
                <input
                  className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Write the task title"
                  required
                  value={form.title}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                  Type
                  <select
                    className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value as "task" | "reminder",
                      }))
                    }
                    value={form.type}
                  >
                    <option value="task">Task</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                  Category
                  <select
                    className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                    onChange={(event) => {
                      const category = categories.find(
                        (item) => item.label === event.target.value
                      );

                      setForm((current) => ({
                        ...current,
                        category: event.target.value,
                        categoryColor: category?.color || current.categoryColor,
                      }));
                    }}
                    value={form.category}
                  >
                    {categories.map((category) => (
                      <option key={category.label} value={category.label}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[12px] font-semibold transition",
                      form.category === category.label
                        ? "border-[var(--flow-ink)] bg-[var(--flow-panel)] text-[var(--flow-ink)]"
                        : "border-[var(--flow-border)] text-[var(--flow-muted)]"
                    )}
                    key={category.label}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        category: category.label,
                        categoryColor: category.color,
                      }))
                    }
                    type="button"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                  Date
                  <input
                    className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scheduledDate: event.target.value,
                      }))
                    }
                    type="date"
                    value={form.scheduledDate}
                  />
                </label>

                <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                  Time
                  <input
                    className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        scheduledTime: event.target.value,
                      }))
                    }
                    type="time"
                    value={form.scheduledTime}
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                Notes
                <textarea
                  className="min-h-[88px] resize-none rounded-lg border border-[var(--flow-border)] bg-white px-3 py-2 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Add context, links, or a reminder detail"
                  value={form.notes}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-4 text-[13px] font-semibold text-[var(--flow-muted)] transition hover:text-[var(--flow-ink)]"
                disabled={isSaving}
                onClick={() => saveTask(true)}
                type="button"
              >
                Save as draft
              </button>
              <button
                className="h-10 rounded-lg bg-[var(--flow-ink)] px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(47,61,84,0.16)] disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : "Save to date"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function TaskChip({
  onDragStart,
  task,
}: {
  onDragStart: (event: DragEvent, taskId: number) => void;
  task: CalendarTask;
}) {
  const isReminder = task.type === "reminder";

  return (
    <div
      className="flex min-w-0 cursor-grab items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-[11px] font-semibold shadow-sm active:cursor-grabbing"
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
      style={{
        borderColor: `${task.categoryColor}55`,
        color: task.categoryColor,
      }}
      title={task.title}
    >
      {isReminder ? (
        <Bell className="h-3 w-3 shrink-0" />
      ) : (
        <Clock3 className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">{task.title}</span>
    </div>
  );
}

function DraftCard({
  onDragStart,
  task,
}: {
  onDragStart: (event: DragEvent, taskId: number) => void;
  task: CalendarTask;
}) {
  return (
    <div
      className="cursor-grab rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] p-3 active:cursor-grabbing"
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[var(--flow-ink)]">
            {task.title}
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--flow-muted)]">
            {task.type}
          </p>
        </div>
        <GripVertical className="h-4 w-4 shrink-0 text-[var(--flow-soft)]" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span
          className="flex min-w-0 items-center gap-1.5 rounded-md bg-white px-2 py-1 text-[11px] font-semibold"
          style={{ color: task.categoryColor }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: task.categoryColor }}
          />
          <span className="truncate">{task.category}</span>
        </span>
        <span className="text-[11px] font-semibold text-[var(--flow-muted)]">
          Drag
        </span>
      </div>
    </div>
  );
}
