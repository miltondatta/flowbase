import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { calendarTasks, db } from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

type CalendarTaskPayload = {
  title?: string;
  type?: string;
  category?: string;
  categoryColor?: string;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  notes?: string | null;
};

function normalizePayload(payload: CalendarTaskPayload) {
  const title = payload.title?.trim();

  if (!title) {
    throw new Error("Task title is required.");
  }

  return {
    title,
    type: payload.type === "reminder" ? "reminder" : "task",
    category: payload.category?.trim() || "Planning",
    categoryColor: payload.categoryColor?.trim() || "#54a8ff",
    scheduledDate: payload.scheduledDate || null,
    scheduledTime: payload.scheduledTime || null,
    notes: payload.notes?.trim() || null,
    status: payload.scheduledDate ? "scheduled" : "draft",
  };
}

export async function GET() {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await db
    .select()
    .from(calendarTasks)
    .where(eq(calendarTasks.userId, user.id))
    .orderBy(desc(calendarTasks.createdAt));

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = normalizePayload(await request.json());
    const [task] = await db
      .insert(calendarTasks)
      .values({
        ...payload,
        userId: user.id,
      })
      .returning();

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create task." },
      { status: 400 }
    );
  }
}
