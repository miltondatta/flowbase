import { NextResponse } from "next/server";

import { db, notes } from "@/db";
import { getUserNote } from "@/lib/notes";
import { syncCurrentUser } from "@/lib/sync-user";

type RouteContext = {
  params: Promise<{ noteId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await context.params;
  const id = Number(noteId);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid note id." }, { status: 400 });
  }

  const sourceNote = await getUserNote(id, user);

  if (!sourceNote) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  const [note] = await db
    .insert(notes)
    .values({
      userId: user.id,
      title: `${sourceNote.title} copy`,
      contentJson: sourceNote.contentJson,
      plainText: sourceNote.plainText,
      color: sourceNote.color,
      isPinned: false,
      isTrashed: false,
    })
    .returning();

  return NextResponse.json({ note }, { status: 201 });
}
