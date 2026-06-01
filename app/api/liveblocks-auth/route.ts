import { NextResponse } from "next/server";

import { getAccessibleBoard, parseKanbanRoomId } from "@/lib/kanban";
import {
  ensureKanbanRoomAccess,
  getLiveblocksClient,
  liveblocksUserInfo,
} from "@/lib/liveblocks";
import { syncCurrentUser } from "@/lib/sync-user";

export async function POST(request: Request) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as { room?: string };
  const boardId = payload.room ? parseKanbanRoomId(payload.room) : null;

  if (payload.room && !boardId) {
    return NextResponse.json({ error: "Invalid room." }, { status: 403 });
  }

  if (boardId) {
    const access = await getAccessibleBoard(boardId, user);

    if (!access) {
      return NextResponse.json({ error: "Room access denied." }, { status: 403 });
    }

    await ensureKanbanRoomAccess(boardId);
  }

  const liveblocks = getLiveblocksClient();
  const session = liveblocks.prepareSession(String(user.id), {
    userInfo: await liveblocksUserInfo(user),
  });

  if (payload.room) {
    session.allow(payload.room, session.FULL_ACCESS);
  }

  const { status, body } = await session.authorize();

  return new Response(body, { status });
}
