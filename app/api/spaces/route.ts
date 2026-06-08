import { db } from "@/db";
import { spaces, pages } from "@/db/schema";
import { eq, and, like, desc, asc, sql, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

// GET /api/spaces → list all user spaces with filtering, sorting, search
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const sort = searchParams.get("sort");
  const search = searchParams.get("search");

  // Build base conditions
  const whereConditions: any[] = [eq(spaces.userId, userId)];

  // Apply filter
  if (filter === "favorites") {
    whereConditions.push(eq(spaces.isFavorite, true));
  } else if (filter === "archived") {
    whereConditions.push(eq(spaces.isArchived, true));
  } else {
    // Default: show non-archived only
    whereConditions.push(eq(spaces.isArchived, false));
  }

  // Apply search
  if (search) {
    const searchTerm = `%${search}%`;
    whereConditions.push(
      or(
        like(spaces.name, searchTerm),
        like(spaces.description ?? "", searchTerm)
      )
    );
  }

  // Handle sorting by page count (requires join)
  if (sort === "pages") {
    const spacesWithCount = await db
      .select({
        id: spaces.id,
        userId: spaces.userId,
        name: spaces.name,
        description: spaces.description,
        color: spaces.color,
        isFavorite: spaces.isFavorite,
        isArchived: spaces.isArchived,
        createdAt: spaces.createdAt,
        updatedAt: spaces.updatedAt,
        pageCount: sql<number>`count(${pages.id})::int`,
      })
      .from(spaces)
      .leftJoin(pages, eq(pages.spaceId, spaces.id))
      .where(and(...whereConditions))
      .groupBy(spaces.id)
      .orderBy(desc(sql`count(${pages.id})`));
    
    return Response.json(spacesWithCount);
  }

  // Build query for other sorts
  let query = db.select().from(spaces).where(and(...whereConditions));

  // Apply sorting
  if (sort === "name") {
    query = query.orderBy(asc(spaces.name));
  } else if (sort === "favorites") {
    query = query.orderBy(desc(spaces.isFavorite), desc(spaces.updatedAt));
  } else {
    // Default: recently updated
    query = query.orderBy(desc(spaces.updatedAt));
  }

  const data = await query;
  return Response.json(data || []);
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

// PATCH /api/spaces/[id] → update space (favorite, archive, etc.)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const spaceId = parseInt(params.id);

  const updates: Record<string, any> = {};
  if ("isFavorite" in body) updates.isFavorite = body.isFavorite;
  if ("isArchived" in body) updates.isArchived = body.isArchived;
  if ("name" in body) updates.name = body.name;
  if ("description" in body) updates.description = body.description;
  if ("color" in body) updates.color = body.color;

  if (Object.keys(updates).length === 0) {
    return new Response("No updates provided", { status: 400 });
  }

  const result = await db
    .update(spaces)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(spaces.id, spaceId), eq(spaces.userId, userId)))
    .returning();

  if (result.length === 0) {
    return Response.json({ error: "Space not found" }, { status: 404 });
  }

  return Response.json(result[0]);
}

// DELETE /api/spaces/[id] → delete space
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const spaceId = parseInt(params.id);

  await db
    .delete(spaces)
    .where(and(eq(spaces.id, spaceId), eq(spaces.userId, userId)));

  return new Response(null, { status: 204 });
}