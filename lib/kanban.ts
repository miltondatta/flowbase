import { and, eq } from "drizzle-orm";

import {
  calendarTasks,
  db,
  kanbanBoards,
  kanbanColumns,
  type KanbanLabel,
  type KanbanTask,
} from "@/db";

export const defaultBoardColors = [
  "#54a8ff",
  "#68d8bd",
  "#ff8c67",
  "#f4b942",
  "#9b8cff",
  "#ef6f91",
];

export const defaultColumns = ["Todo", "In Progress", "Done"];

const priorityColors: Record<string, string> = {
  Low: "#68d8bd",
  Medium: "#f4b942",
  High: "#ff8c67",
};

export function normalizeBoardPayload(payload: {
  name?: string;
  color?: string;
}) {
  const name = payload.name?.trim();

  if (!name) {
    throw new Error("Board name is required.");
  }

  return {
    name,
    color: payload.color?.trim() || defaultBoardColors[0],
  };
}

export function normalizeColumnName(name?: string) {
  const nextName = name?.trim();

  if (!nextName) {
    throw new Error("Column name is required.");
  }

  return nextName;
}

export function normalizeLabels(labels: unknown): KanbanLabel[] {
  if (!Array.isArray(labels)) {
    return [];
  }

  return labels
    .map((label) => {
      if (!label || typeof label !== "object") {
        return null;
      }

      const item = label as { name?: unknown; color?: unknown };
      const name = typeof item.name === "string" ? item.name.trim() : "";
      const color = typeof item.color === "string" ? item.color.trim() : "";

      if (!name) {
        return null;
      }

      return {
        name,
        color: color || "#54a8ff",
      };
    })
    .filter((label): label is KanbanLabel => Boolean(label))
    .slice(0, 6);
}

export function normalizeTaskPayload(payload: {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: string;
  labels?: unknown;
  syncCalendar?: boolean;
  linkNotes?: boolean;
}) {
  const title = payload.title?.trim();

  if (!title) {
    throw new Error("Task title is required.");
  }

  const priority = ["Low", "Medium", "High"].includes(payload.priority || "")
    ? payload.priority || "Medium"
    : "Medium";

  return {
    title,
    description: payload.description?.trim() || null,
    dueDate: payload.dueDate || null,
    priority,
    labels: normalizeLabels(payload.labels),
    syncCalendar: Boolean(payload.syncCalendar),
    linkNotes: Boolean(payload.linkNotes),
  };
}

export async function getUserBoard(boardId: number, userId: number) {
  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, userId)))
    .limit(1);

  return board || null;
}

export async function getUserColumn(columnId: number, userId: number) {
  const [result] = await db
    .select({
      column: kanbanColumns,
      board: kanbanBoards,
    })
    .from(kanbanColumns)
    .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
    .where(and(eq(kanbanColumns.id, columnId), eq(kanbanBoards.userId, userId)))
    .limit(1);

  return result || null;
}

function calendarPayloadForTask(
  task: Pick<
    KanbanTask,
    "title" | "description" | "dueDate" | "priority" | "labels" | "syncCalendar"
  >
) {
  const primaryLabel = task.labels[0];
  const labelNames = task.labels.map((label) => label.name).join(", ");
  const notes = [
    task.description,
    `Priority: ${task.priority}`,
    labelNames ? `Labels: ${labelNames}` : null,
    "Synced from Kanban.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: task.title,
    type: "task",
    category: primaryLabel?.name || task.priority,
    categoryColor: primaryLabel?.color || priorityColors[task.priority] || "#f4b942",
    scheduledDate: task.dueDate,
    scheduledTime: null,
    notes,
    status: task.dueDate ? "scheduled" : "draft",
  };
}

export async function createLinkedCalendarTask(userId: number, task: KanbanTask) {
  if (!task.syncCalendar) {
    return null;
  }

  const [calendarTask] = await db
    .insert(calendarTasks)
    .values({
      ...calendarPayloadForTask(task),
      userId,
    })
    .returning();

  return calendarTask;
}

export async function updateLinkedCalendarTask(userId: number, task: KanbanTask) {
  if (!task.syncCalendar) {
    return null;
  }

  if (task.calendarTaskId) {
    const [calendarTask] = await db
      .update(calendarTasks)
      .set({
        ...calendarPayloadForTask(task),
        updatedAt: new Date(),
      })
      .where(
        and(eq(calendarTasks.id, task.calendarTaskId), eq(calendarTasks.userId, userId))
      )
      .returning();

    if (calendarTask) {
      return calendarTask;
    }
  }

  return createLinkedCalendarTask(userId, task);
}

export async function deleteLinkedCalendarTask(userId: number, calendarTaskId: number) {
  await db
    .delete(calendarTasks)
    .where(and(eq(calendarTasks.id, calendarTaskId), eq(calendarTasks.userId, userId)));
}
