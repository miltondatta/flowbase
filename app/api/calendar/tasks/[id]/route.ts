import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { calendarTasks, db } from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

type UpdatePayload = {
  title?: string;
  type?: string;
  category?: string;
  categoryColor?: string;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  notes?: string | null;
  status?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await syncCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const taskId = Number(id);

  if (!Number.isInteger(taskId)) {
    return NextResponse.json({ error: "Invalid task id." }, { status: 400 });
  }

  try {
    const payload = (await request.json()) as UpdatePayload;
    const updateValues: Partial<typeof calendarTasks.$inferInsert> = {
      updatedAt: new Date(),
    };

    if ("title" in payload) {
      const title = payload.title?.trim();

      if (!title) {
        return NextResponse.json(
          { error: "Task title is required." },
          { status: 400 }
        );
      }

      updateValues.title = title;
    }

    if ("type" in payload) {
      updateValues.type = payload.type === "reminder" ? "reminder" : "task";
    }

    if ("category" in payload) {
      updateValues.category = payload.category?.trim() || "Planning";
    }

    if ("categoryColor" in payload) {
      updateValues.categoryColor = payload.categoryColor?.trim() || "#54a8ff";
    }

    if ("scheduledDate" in payload) {
      updateValues.scheduledDate = payload.scheduledDate || null;
      updateValues.status = payload.scheduledDate ? "scheduled" : "draft";
    }

    if ("scheduledTime" in payload) {
      updateValues.scheduledTime = payload.scheduledTime || null;
    }

    if ("notes" in payload) {
      updateValues.notes = payload.notes?.trim() || null;
    }

    if ("status" in payload && !("scheduledDate" in payload)) {
      updateValues.status = payload.status || "draft";
    }

    const [task] = await db
      .update(calendarTasks)
      .set(updateValues)
      .where(
        and(eq(calendarTasks.id, taskId), eq(calendarTasks.userId, user.id))
      )
      .returning();

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Calendar task update failed", error);

    return NextResponse.json(
      { error: "Unable to update this calendar task. Please try again." },
      { status: 400 }
    );
  }
}
