import { NextResponse } from "next/server";
import { and, asc, eq, ne } from "drizzle-orm";

import { db, kanbanBoards, kanbanColumns, kanbanTasks } from "@/db";
import { getAccessibleColumn, normalizeColumnName } from "@/lib/kanban";
import { syncCurrentUser } from "@/lib/sync-user";

type RouteContext = {
  params: Promise<{ columnId: string }>;
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
    const payload = (await request.json()) as {
      name?: string;
      orderIndex?: number;
    };

    if ("orderIndex" in payload) {
      const nextIndex = Number(payload.orderIndex);

      if (!Number.isInteger(nextIndex)) {
        return NextResponse.json(
          { error: "Invalid column position." },
          { status: 400 }
        );
      }

      const siblings = await db
        .select()
        .from(kanbanColumns)
        .where(eq(kanbanColumns.boardId, result.board.id))
        .orderBy(asc(kanbanColumns.orderIndex), asc(kanbanColumns.createdAt));
      const currentIndex = siblings.findIndex((column) => column.id === id);

      if (currentIndex === -1) {
        return NextResponse.json(
          { error: "Column not found." },
          { status: 404 }
        );
      }

      const [movingColumn] = siblings.splice(currentIndex, 1);
      siblings.splice(Math.max(0, Math.min(nextIndex, siblings.length)), 0, movingColumn);

      await Promise.all(
        siblings.map((column, index) =>
          db
            .update(kanbanColumns)
            .set({
              orderIndex: index,
              updatedAt: new Date(),
            })
            .where(eq(kanbanColumns.id, column.id))
        )
      );

      await db
        .update(kanbanBoards)
        .set({ updatedAt: new Date() })
        .where(eq(kanbanBoards.id, result.board.id));

      return NextResponse.json({
        columns: siblings.map((column, index) => ({
          ...column,
          orderIndex: index,
        })),
      });
    }

    const name = normalizeColumnName(payload.name);
    const [column] = await db
      .update(kanbanColumns)
      .set({
        name,
        updatedAt: new Date(),
      })
      .where(eq(kanbanColumns.id, id))
      .returning();

    await db
      .update(kanbanBoards)
      .set({ updatedAt: new Date() })
      .where(eq(kanbanBoards.id, result.board.id));

    return NextResponse.json({ column });
  } catch (error) {
    console.error("Kanban column update failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Column name is required."
            ? error.message
            : "Unable to update this column. Please try again.",
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

  const { columnId } = await context.params;
  const id = parseId(columnId);

  if (!id) {
    return NextResponse.json({ error: "Invalid column id." }, { status: 400 });
  }

  const result = await getAccessibleColumn(id, user);

  if (!result) {
    return NextResponse.json({ error: "Column not found." }, { status: 404 });
  }

  const siblings = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, result.board.id))
    .orderBy(asc(kanbanColumns.orderIndex), asc(kanbanColumns.createdAt));

  if (siblings.length <= 1) {
    return NextResponse.json(
      { error: "A board needs at least one column." },
      { status: 400 }
    );
  }

  const todoColumn = siblings.find(
    (column) => column.id !== id && column.name.toLowerCase() === "todo"
  );
  const fallbackColumn =
    todoColumn || siblings.find((column) => column.id !== id) || null;

  if (!fallbackColumn) {
    return NextResponse.json(
      { error: "Unable to find a destination column for existing tasks." },
      { status: 400 }
    );
  }

  await db
    .update(kanbanTasks)
    .set({
      columnId: fallbackColumn.id,
      updatedAt: new Date(),
    })
    .where(and(eq(kanbanTasks.columnId, id), ne(kanbanTasks.columnId, fallbackColumn.id)));

  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));
  await db
    .update(kanbanBoards)
    .set({ updatedAt: new Date() })
    .where(eq(kanbanBoards.id, result.board.id));

  return NextResponse.json({
    success: true,
    movedToColumnId: fallbackColumn.id,
  });
}
