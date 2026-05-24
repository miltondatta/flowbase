import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { db, kanbanColumns, kanbanBoards } from "@/db";
import { getEditableBoard, normalizeColumnName } from "@/lib/kanban";
import { syncCurrentUser } from "@/lib/sync-user";

type RouteContext = {
  params: Promise<{ boardId: string }>;
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

  try {
    const payload = (await request.json()) as { name?: string };
    const name = normalizeColumnName(payload.name);
    const existingColumns = await db
      .select()
      .from(kanbanColumns)
      .where(eq(kanbanColumns.boardId, id))
      .orderBy(asc(kanbanColumns.orderIndex));

    if (existingColumns.length >= 5) {
      return NextResponse.json(
        { error: "Boards can have a maximum of 5 columns." },
        { status: 400 }
      );
    }

    const [column] = await db
      .insert(kanbanColumns)
      .values({
        boardId: id,
        name,
        orderIndex: existingColumns.length,
      })
      .returning();

    await db
      .update(kanbanBoards)
      .set({ updatedAt: new Date() })
      .where(eq(kanbanBoards.id, id));

    return NextResponse.json(
      { column: { ...column, tasks: [] } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Kanban column create failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "Column name is required."
            ? error.message
            : "Unable to create this column. Please try again.",
      },
      { status: 400 }
    );
  }
}
