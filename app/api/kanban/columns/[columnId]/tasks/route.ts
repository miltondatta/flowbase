import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, kanbanBoards, kanbanTasks } from "@/db";
import {
  createLinkedCalendarTask,
  getAccessibleColumn,
  normalizeTaskPayload,
} from "@/lib/kanban";
import { syncCurrentUser } from "@/lib/sync-user";

type RouteContext = {
  params: Promise<{ columnId: string }>;
};

function parseId(id: string) {
  const value = Number(id);

  return Number.isInteger(value) ? value : null;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { columnId } = await context.params;
  const id = parseId(columnId);

  if (!id) {
    return NextResponse.json({ error: "Invalid column id." }, { status: 400 });
  }

  const result = await getAccessibleColumn(id, user);

  if (!result) {
    return NextResponse.json({ error: "Column not found." }, { status: 404 });
  }

  try {
    const payload = normalizeTaskPayload(await request.json());
    const [createdTask] = await db
      .insert(kanbanTasks)
      .values({
        ...payload,
        boardId: result.board.id,
        columnId: id,
      })
      .returning();
    const calendarTask = await createLinkedCalendarTask(result.board.userId, createdTask);
    const task = calendarTask
      ? (
          await db
            .update(kanbanTasks)
            .set({
              calendarTaskId: calendarTask.id,
              updatedAt: new Date(),
            })
            .where(eq(kanbanTasks.id, createdTask.id))
            .returning()
        )[0]
      : createdTask;

    await db
      .update(kanbanBoards)
      .set({ updatedAt: new Date() })
      .where(eq(kanbanBoards.id, result.board.id));

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Kanban task create failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Task title is required."
            ? error.message
            : "Unable to create this task. Please try again.",
      },
      { status: 400 }
    );
  }
}
