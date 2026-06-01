import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db, notes } from "@/db";
import { buildNoteCreateValues, type NotePayload } from "@/lib/notes";
import { syncCurrentUser } from "@/lib/sync-user";

export async function GET() {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, user.id))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt), desc(notes.createdAt));

  return NextResponse.json({ notes: userNotes });
}

export async function POST(request: Request) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as NotePayload;
    const [note] = await db
      .insert(notes)
      .values(buildNoteCreateValues(payload, user.id))
      .returning();

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error("Note create failed", error);

    return NextResponse.json(
      { error: "Unable to create this note. Please try again." },
      { status: 400 }
    );
  }
}
