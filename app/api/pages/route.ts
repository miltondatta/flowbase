import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// GET /api/pages?spaceId=123 → list pages in a space
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const spaceId = searchParams.get("spaceId");

  if (!spaceId) return new Response("spaceId is required", { status: 400 });

  const data = await db
    .select()
    .from(pages)
    .where(eq(pages.spaceId, Number(spaceId)));

  return Response.json(data);
}

// POST /api/pages → create page
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { name, description, spaceId, template } = body;

  if (!name) return new Response("Name is required", { status: 400 });
  if (!spaceId) return new Response("spaceId is required", { status: 400 });

  const [created] = await db
    .insert(pages)
    .values({
      userId,
      name,
      description: description ?? "",
      spaceId: Number(spaceId),
      template: template ?? "blank",
    })
    .returning();

  return Response.json(created);
}