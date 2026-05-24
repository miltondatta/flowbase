import { and, eq, or } from "drizzle-orm";

import {
  calendarTasks,
  db,
  kanbanBoardShares,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  users,
  type KanbanLabel,
  type KanbanTask,
  type User,
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

export function normalizeShareEmail(email?: string) {
  const nextEmail = email?.trim().toLowerCase();

  if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    throw new Error("A valid email address is required.");
  }

  return nextEmail;
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

export async function getAccessibleBoard(boardId: number, user: User) {
  const [result] = await db
    .select({
      board: kanbanBoards,
      share: kanbanBoardShares,
    })
    .from(kanbanBoards)
    .leftJoin(
      kanbanBoardShares,
      and(
        eq(kanbanBoardShares.boardId, kanbanBoards.id),
        or(
          eq(kanbanBoardShares.userId, user.id),
          eq(kanbanBoardShares.email, user.email.toLowerCase())
        )
      )
    )
    .where(
      and(
        eq(kanbanBoards.id, boardId),
        or(eq(kanbanBoards.userId, user.id), eq(kanbanBoardShares.role, "editor"))
      )
    )
    .limit(1);

  return result || null;
}

export async function getEditableBoard(boardId: number, user: User) {
  return getAccessibleBoard(boardId, user);
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

export async function getAccessibleColumn(columnId: number, user: User) {
  const [result] = await db
    .select({
      column: kanbanColumns,
      board: kanbanBoards,
      share: kanbanBoardShares,
    })
    .from(kanbanColumns)
    .innerJoin(kanbanBoards, eq(kanbanColumns.boardId, kanbanBoards.id))
    .leftJoin(
      kanbanBoardShares,
      and(
        eq(kanbanBoardShares.boardId, kanbanBoards.id),
        or(
          eq(kanbanBoardShares.userId, user.id),
          eq(kanbanBoardShares.email, user.email.toLowerCase())
        )
      )
    )
    .where(
      and(
        eq(kanbanColumns.id, columnId),
        or(eq(kanbanBoards.userId, user.id), eq(kanbanBoardShares.role, "editor"))
      )
    )
    .limit(1);

  return result || null;
}

export async function getAccessibleTask(taskId: number, user: User) {
  const [result] = await db
    .select({
      task: kanbanTasks,
      board: kanbanBoards,
      share: kanbanBoardShares,
    })
    .from(kanbanTasks)
    .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
    .leftJoin(
      kanbanBoardShares,
      and(
        eq(kanbanBoardShares.boardId, kanbanBoards.id),
        or(
          eq(kanbanBoardShares.userId, user.id),
          eq(kanbanBoardShares.email, user.email.toLowerCase())
        )
      )
    )
    .where(
      and(
        eq(kanbanTasks.id, taskId),
        or(eq(kanbanBoards.userId, user.id), eq(kanbanBoardShares.role, "editor"))
      )
    )
    .limit(1);

  return result || null;
}

export async function getBoardCollaborators(boardId: number) {
  const [board] = await db
    .select({
      id: kanbanBoards.id,
      ownerId: kanbanBoards.userId,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(kanbanBoards)
    .innerJoin(users, eq(kanbanBoards.userId, users.id))
    .where(eq(kanbanBoards.id, boardId))
    .limit(1);

  if (!board) {
    return null;
  }

  const shares = await db
    .select({
      id: kanbanBoardShares.id,
      email: kanbanBoardShares.email,
      role: kanbanBoardShares.role,
      userId: kanbanBoardShares.userId,
      name: users.name,
      createdAt: kanbanBoardShares.createdAt,
    })
    .from(kanbanBoardShares)
    .leftJoin(users, eq(kanbanBoardShares.userId, users.id))
    .where(eq(kanbanBoardShares.boardId, boardId));

  return {
    owner: {
      id: `owner-${board.ownerId}`,
      userId: board.ownerId,
      email: board.ownerEmail,
      name: board.ownerName || board.ownerEmail,
      role: "owner",
      status: "active",
    },
    shares: shares.map((share) => ({
      id: `share-${share.id}`,
      userId: share.userId,
      email: share.email,
      name: share.name || share.email,
      role: share.role,
      status: share.userId ? "active" : "pending",
      createdAt: share.createdAt,
    })),
  };
}

export function kanbanRoomId(boardId: number) {
  return `kanban-board-${boardId}`;
}

export function parseKanbanRoomId(roomId: string) {
  const match = /^kanban-board-(\d+)$/.exec(roomId);

  if (!match) {
    return null;
  }

  const boardId = Number(match[1]);

  return Number.isInteger(boardId) ? boardId : null;
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
