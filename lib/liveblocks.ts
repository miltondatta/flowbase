import { Liveblocks } from "@liveblocks/node";
import { eq, inArray } from "drizzle-orm";

import { db, kanbanBoardShares, kanbanBoards, users, type User } from "@/db";
import { getBoardCollaborators, kanbanRoomId } from "@/lib/kanban";

const avatarColors = ["#54a8ff", "#68d8bd", "#ff8c67", "#f4b942", "#9b8cff", "#48b98f"];

export function userAvatarColor(seed: string | number) {
  const value = String(seed);
  const total = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return avatarColors[total % avatarColors.length];
}

export function userInitials(user: Pick<User, "name" | "email">) {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function getLiveblocksClient() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not configured.");
  }

  return new Liveblocks({ secret });
}

export async function getBoardRoomUserAccesses(boardId: number) {
  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.id, boardId))
    .limit(1);

  if (!board) {
    return null;
  }

  const shares = await db
    .select()
    .from(kanbanBoardShares)
    .where(eq(kanbanBoardShares.boardId, boardId));

  const userIds = new Set([String(board.userId)]);

  for (const share of shares) {
    if (share.userId) {
      userIds.add(String(share.userId));
    }
  }

  return Object.fromEntries(
    [...userIds].map((userId) => [userId, ["room:write"] as ["room:write"]])
  ) as Record<string, ["room:write"]>;
}

export async function ensureKanbanRoomAccess(boardId: number) {
  const usersAccesses = await getBoardRoomUserAccesses(boardId);

  if (!usersAccesses) {
    return null;
  }

  const roomId = kanbanRoomId(boardId);
  const liveblocks = getLiveblocksClient();

  await liveblocks.getOrCreateRoom(roomId, {
    defaultAccesses: [],
    usersAccesses,
    metadata: {
      product: "kanban",
      boardId: String(boardId),
    },
  });

  await liveblocks.updateRoom(roomId, {
    defaultAccesses: [],
    usersAccesses,
    metadata: {
      product: "kanban",
      boardId: String(boardId),
    },
  });

  return roomId;
}

export async function liveblocksUserInfo(user: User) {
  return {
    name: user.name || user.email,
    email: user.email,
    initials: userInitials(user),
    color: userAvatarColor(user.id),
  };
}

export async function resolveLiveblocksUsers(userIds: string[]) {
  const ids = userIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id));

  if (ids.length === 0) {
    return userIds.map(() => null);
  }

  const records = await db.select().from(users).where(inArray(users.id, ids));

  return userIds.map((userId) => {
    const user = records.find((record) => record.id === Number(userId));

    if (!user) {
      return null;
    }

    return {
      name: user.name || user.email,
      email: user.email,
      initials: userInitials(user),
      color: userAvatarColor(user.id),
    };
  });
}

export async function getBoardShareList(boardId: number) {
  const collaborators = await getBoardCollaborators(boardId);

  if (!collaborators) {
    return null;
  }

  return [collaborators.owner, ...collaborators.shares];
}
