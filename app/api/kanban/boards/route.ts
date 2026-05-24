import { NextResponse } from "next/server";
import { asc, desc, eq, inArray } from "drizzle-orm";

import { db, kanbanBoards, kanbanColumns, kanbanTasks } from "@/db";
import {
  defaultColumns,
  normalizeBoardPayload,
} from "@/lib/kanban";
import { syncCurrentUser } from "@/lib/sync-user";

export async function GET() {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boards = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.userId, user.id))
    .orderBy(desc(kanbanBoards.updatedAt), desc(kanbanBoards.createdAt));

  if (boards.length === 0) {
    return NextResponse.json({ boards: [] });
  }

  const boardIds = boards.map((board) => board.id);
  const columns = await db
    .select()
    .from(kanbanColumns)
    .where(inArray(kanbanColumns.boardId, boardIds))
    .orderBy(asc(kanbanColumns.orderIndex), asc(kanbanColumns.createdAt));
  const tasks = await db
    .select()
    .from(kanbanTasks)
    .where(inArray(kanbanTasks.boardId, boardIds))
    .orderBy(desc(kanbanTasks.updatedAt), desc(kanbanTasks.createdAt));

  return NextResponse.json({
    boards: boards.map((board) => ({
      ...board,
      columns: columns
        .filter((column) => column.boardId === board.id)
        .map((column) => ({
          ...column,
          tasks: tasks.filter((task) => task.columnId === column.id),
        })),
    })),
  });
}

export async function POST(request: Request) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = normalizeBoardPayload(await request.json());
    const [board] = await db
      .insert(kanbanBoards)
      .values({
        ...payload,
        userId: user.id,
      })
      .returning();

    const columns = await db
      .insert(kanbanColumns)
      .values(
        defaultColumns.map((name, index) => ({
          boardId: board.id,
          name,
          orderIndex: index,
        }))
      )
      .returning();

    return NextResponse.json(
      {
        board: {
          ...board,
          columns: columns.map((column) => ({ ...column, tasks: [] })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Kanban board create failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Board name is required."
            ? error.message
            : "Unable to create this board. Please try again.",
      },
      { status: 400 }
    );
  }
}
