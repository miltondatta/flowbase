import { NextResponse } from "next/server";
import { db } from "@/db";
import { whiteboards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request, context: any) {
  const { id } = await context.params;
  const cleanId = id.split("?")[0];

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [board] = await db
    .select()
    .from(whiteboards)
    .where(eq(whiteboards.id, Number(cleanId)));

  if (!board || board.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

return NextResponse.json(board);
}

export async function PATCH(req: Request, context: any) {
  const { id } = await context.params;
  const cleanId = id.split("?")[0];

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates = await req.json();

  const [updated] = await db
    .update(whiteboards)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(whiteboards.id, Number(cleanId)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, context: any) {
  const { id } = await context.params;
  const cleanId = id.split("?")[0];

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.delete(whiteboards).where(eq(whiteboards.id, Number(cleanId)));

  return NextResponse.json({ success: true });
}