import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { calendarTasks, db } from "@/db";
import { syncCurrentUser } from "@/lib/sync-user";

type UpdatePayload = {
  scheduledDate?: string | null;
  scheduledTime?: string | null;
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
    const scheduledDate = payload.scheduledDate || null;
    const scheduledTime = payload.scheduledTime || null;

    const [task] = await db
      .update(calendarTasks)
      .set({
        scheduledDate,
        scheduledTime,
        status: scheduledDate ? "scheduled" : payload.status || "draft",
        updatedAt: new Date(),
      })
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
