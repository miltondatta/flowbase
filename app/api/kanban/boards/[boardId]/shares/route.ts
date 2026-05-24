import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, kanbanBoardShares, users } from "@/db";
import { getEditableBoard, normalizeShareEmail } from "@/lib/kanban";
import { ensureKanbanRoomAccess, getBoardShareList } from "@/lib/liveblocks";
import { syncCurrentUser } from "@/lib/sync-user";

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

function parseId(id: string) {
  const value = Number(id);

  return Number.isInteger(value) ? value : null;
}

export async function GET(_request: Request, context: RouteContext) {
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

  if (!access) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  return NextResponse.json({ collaborators: await getBoardShareList(id) });
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

  if (!access) {
    return NextResponse.json({ error: "Board not found." }, { status: 404 });
  }

  try {
    const payload = (await request.json()) as { email?: string };
    const email = normalizeShareEmail(payload.email);

    if (email === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You already have access to this board." },
        { status: 400 }
      );
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    await db
      .insert(kanbanBoardShares)
      .values({
        boardId: id,
        email,
        userId: existingUser?.id || null,
        role: "editor",
        invitedByUserId: user.id,
      })
      .onConflictDoUpdate({
        target: [kanbanBoardShares.boardId, kanbanBoardShares.email],
        set: {
          userId: existingUser?.id || null,
          role: "editor",
          invitedByUserId: user.id,
          updatedAt: new Date(),
        },
      });

    await ensureKanbanRoomAccess(id);

    return NextResponse.json({
      collaborators: await getBoardShareList(id),
    });
  } catch (error) {
    console.error("Kanban share invite failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "A valid email address is required."
            ? error.message
            : "Unable to invite this collaborator. Please try again.",
      },
      { status: 400 }
    );
  }
}
