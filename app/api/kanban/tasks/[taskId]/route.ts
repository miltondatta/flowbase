import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, kanbanBoards, kanbanTasks } from "@/db";
import {
  deleteLinkedCalendarTask,
  getAccessibleColumn,
  getAccessibleTask,
  normalizeTaskPayload,
  updateLinkedCalendarTask,
} from "@/lib/kanban";
import { syncCurrentUser } from "@/lib/sync-user";

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

type TaskUpdatePayload = {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: string;
  labels?: unknown;
  syncCalendar?: boolean;
  linkNotes?: boolean;
  columnId?: number;
};

function parseId(id: string) {
  const value = Number(id);

  return Number.isInteger(value) ? value : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  const id = parseId(taskId);

  if (!id) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }

  const result = await getAccessibleTask(id, user);

  if (!result) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  try {
    const payload = (await request.json()) as TaskUpdatePayload;
    const updateValues: Partial<typeof kanbanTasks.$inferInsert> = {
      updatedAt: new Date(),
    };
    const isTaskContentUpdate =
      "title" in payload ||
      "description" in payload ||
      "dueDate" in payload ||
      "priority" in payload ||
      "labels" in payload ||
      "syncCalendar" in payload ||
      "linkNotes" in payload;

    if ("columnId" in payload) {
      const nextColumnId = Number(payload.columnId);
      const nextColumn = Number.isInteger(nextColumnId)
        ? await getAccessibleColumn(nextColumnId, user)
        : null;

      if (!nextColumn || nextColumn.board.id !== result.board.id) {
        return NextResponse.json(
          { error: "Destination column not found." },
          { status: 404 }
        );
      }

      updateValues.columnId = nextColumnId;
    }

    if (isTaskContentUpdate) {
      Object.assign(updateValues, normalizeTaskPayload(payload));
    }

    const [updatedTask] = await db
      .update(kanbanTasks)
      .set(updateValues)
      .where(eq(kanbanTasks.id, id))
      .returning();

    let task = updatedTask;

    if (isTaskContentUpdate) {
      const previousCalendarTaskId = result.task.calendarTaskId;
      const calendarTask = await updateLinkedCalendarTask(result.board.userId, task);
      const [syncedTask] = await db
        .update(kanbanTasks)
        .set({
          calendarTaskId: calendarTask?.id || null,
          updatedAt: new Date(),
        })
        .where(eq(kanbanTasks.id, id))
        .returning();

      task = syncedTask;

      if (!task.syncCalendar && previousCalendarTaskId) {
        await deleteLinkedCalendarTask(result.board.userId, previousCalendarTaskId);
      }
    }

    await db
      .update(kanbanBoards)
      .set({ updatedAt: new Date() })
      .where(eq(kanbanBoards.id, result.board.id));

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Kanban task update failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Task title is required."
            ? error.message
            : "Unable to update this task. Please try again.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await context.params;
  const id = parseId(taskId);

  if (!id) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }

  const result = await getAccessibleTask(id, user);

  if (!result) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }

  await db.delete(kanbanTasks).where(eq(kanbanTasks.id, id));

  if (result.task.calendarTaskId) {
    await deleteLinkedCalendarTask(result.board.userId, result.task.calendarTaskId);
  }

  await db
    .update(kanbanBoards)
    .set({ updatedAt: new Date() })
    .where(eq(kanbanBoards.id, result.board.id));

  return NextResponse.json({ success: true });
}
