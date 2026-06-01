import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db, notes } from "@/db";
import {
  buildNoteUpdateValues,
  getUserNote,
  type NotePayload,
} from "@/lib/notes";
import { syncCurrentUser } from "@/lib/sync-user";

type RouteContext = {
  params: Promise<{ noteId: string }>;
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

  const { noteId } = await context.params;
  const id = parseId(noteId);

  if (!id) {
    return NextResponse.json({ error: "Invalid note id." }, { status: 400 });
  }

  const existingNote = await getUserNote(id, user);

  if (!existingNote) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  try {
    const payload = (await request.json()) as NotePayload;
    const [note] = await db
      .update(notes)
      .set(buildNoteUpdateValues(payload))
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
      .returning();

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Note update failed", error);

    return NextResponse.json(
      { error: "Unable to update this note. Please try again." },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteId } = await context.params;
  const id = parseId(noteId);

  if (!id) {
    return NextResponse.json({ error: "Invalid note id." }, { status: 400 });
  }

  const existingNote = await getUserNote(id, user);

  if (!existingNote) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  if (existingNote.isTrashed) {
    await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, user.id)));

    return NextResponse.json({ success: true, deleted: true });
  }

  const [note] = await db
    .update(notes)
    .set({
      isTrashed: true,
      trashedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .returning();

  return NextResponse.json({ note, deleted: false });
}
