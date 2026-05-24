import { NextResponse } from "next/server";

import { resolveLiveblocksUsers } from "@/lib/liveblocks";
import { syncCurrentUser } from "@/lib/sync-user";

export async function POST(request: Request) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as { userIds?: string[] };
  const userIds = Array.isArray(payload.userIds) ? payload.userIds : [];

  return NextResponse.json({ users: await resolveLiveblocksUsers(userIds) });
}
