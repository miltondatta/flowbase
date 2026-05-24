import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { calendarTasks, db, kanbanBoardShares, kanbanBoards, kanbanColumns, kanbanTasks } from "@/db";
import { getEditableBoard, normalizeBoardPayload } from "@/lib/kanban";
import { syncCurrentUser } from "@/lib/sync-user";

type RouteContext = {
  params: Promise<{ boardId: string }>;
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

  const { boardId } = await context.params;
  const id = parseId(boardId);

  if (!id) {
    return NextResponse.json({ error: "Invalid board id." }, { status: 400 });
  }

  try {
    const payload = normalizeBoardPayload(await request.json());
    const access = await getEditableBoard(id, user);

    if (!access) {
      return NextResponse.json({ error: "Board not found." }, { status: 404 });
    }

    const [board] = await db
      .update(kanbanBoards)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(kanbanBoards.id, id))
      .returning();

    if (!board) {
      return NextResponse.json({ error: "Board not found." }, { status: 404 });
    }

    return NextResponse.json({ board });
  } catch (error) {
    console.error("Kanban board update failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Board name is required."
            ? error.message
            : "Unable to update this board. Please try again.",
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

  const { boardId } = await context.params;
  const id = parseId(boardId);

  if (!id) {
    return NextResponse.json({ error: "Invalid board id." }, { status: 400 });
  }

  const access = await getEditableBoard(id, user);
  const board = access?.board || null;

  if (!board) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  const tasks = await db.select().from(kanbanTasks).where(eq(kanbanTasks.boardId, id));
  const linkedCalendarIds = tasks
    .map((task) => task.calendarTaskId)
    .filter((taskId): taskId is number => Boolean(taskId));

  await db.delete(kanbanTasks).where(eq(kanbanTasks.boardId, id));
  await db.delete(kanbanColumns).where(eq(kanbanColumns.boardId, id));
  await db.delete(kanbanBoardShares).where(eq(kanbanBoardShares.boardId, id));
  await db.delete(kanbanBoards).where(eq(kanbanBoards.id, id));

  if (linkedCalendarIds.length > 0) {
    await db
      .delete(calendarTasks)
      .where(
        and(
          eq(calendarTasks.userId, board.userId),
          inArray(calendarTasks.id, linkedCalendarIds)
        )
      );
  }

  return NextResponse.json({ success: true });
}
