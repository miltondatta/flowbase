import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// GET /api/pages?spaceId=123 → list pages in a space
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const spaceId = searchParams.get("spaceId");
  const sort = searchParams.get("sort");

  if (!spaceId) return new Response("spaceId is required", { status: 400 });

  const baseQuery = db.select().from(pages).where(and(eq(pages.userId, userId), eq(pages.spaceId, Number(spaceId))));

  let data;
  if (sort === "name") {
    data = await baseQuery.orderBy(asc(pages.name));
  } else if (sort === "favorite") {
    data = await baseQuery.orderBy(desc(pages.isFavorite), desc(pages.updatedAt));
  } else {
    data = await baseQuery.orderBy(desc(pages.updatedAt));
  }

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

// PATCH /api/pages/[id] → update page (favorite, archive, rename, etc.)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const pageId = parseInt(params.id);

  const updates: Record<string, any> = {};
  if ("isFavorite" in body) updates.isFavorite = body.isFavorite;
  if ("isArchived" in body) updates.isArchived = body.isArchived;
  if ("name" in body) updates.name = body.name;
  if ("description" in body) updates.description = body.description;
  if ("template" in body) updates.template = body.template;

  if (Object.keys(updates).length === 0) {
    return new Response("No updates provided", { status: 400 });
  }

  const result = await db
    .update(pages)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)))
    .returning();

  if (result.length === 0) {
    return new Response("Page not found", { status: 404 });
  }

  return Response.json(result[0]);
}

// DELETE /api/pages/[id] → delete page
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const pageId = parseInt(params.id);

  await db
    .delete(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, userId)));

  return new Response(null, { status: 204 });
}