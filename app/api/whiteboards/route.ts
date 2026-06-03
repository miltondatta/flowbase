import { NextResponse } from "next/server";
import { db } from "@/db";
import { whiteboards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const boards = await db
    .select()
    .from(whiteboards)
.where(eq(whiteboards.userId, userId));

  return NextResponse.json(boards);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await req.json();

  const [created] = await db
    .insert(whiteboards)
    .values({
userId: userId,
      name: name || "Untitled Whiteboard",
      data: {},
      color: color || "#4f46e5",
    })
    .returning();

  return NextResponse.json(created);
}