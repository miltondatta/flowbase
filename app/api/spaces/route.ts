import { db } from "@/db";
import { spaces } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// GET /api/spaces  → list all user spaces
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const data = await db.select().from(spaces).where(eq(spaces.userId, userId));
  return Response.json(data);
}

// POST /api/spaces → create new space
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { name, description, color } = body;

  if (!name) return new Response("Name is required", { status: 400 });

  const result = await db
    .insert(spaces)
    .values({
      userId,
      name,
      description: description ?? "",
      color: color ?? "#6d28d9",
    })
    .returning();

  return Response.json(result[0]);
}