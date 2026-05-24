import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";

import { db, kanbanBoardShares, kanbanBoards, kanbanColumns, kanbanTasks } from "@/db";
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
    .select({
      board: kanbanBoards,
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
    .where(or(eq(kanbanBoards.userId, user.id), eq(kanbanBoardShares.role, "editor")))
    .orderBy(desc(kanbanBoards.updatedAt), desc(kanbanBoards.createdAt));

  const accessibleBoards = boards.map((result) => result.board);

  if (accessibleBoards.length === 0) {
    return NextResponse.json({ boards: [] });
  }

  const boardIds = accessibleBoards.map((board) => board.id);
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
    boards: accessibleBoards.map((board) => ({
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
