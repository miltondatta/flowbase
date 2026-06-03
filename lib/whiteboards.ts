import { db } from "@/db";
import { whiteboards, NewWhiteboard } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Fetch all whiteboards for a given user.
 */
export async function getWhiteboards(userId: string) {
  return db.select().from(whiteboards).where(eq(whiteboards.userId, userId));
}

/**
 * Fetch a single whiteboard by ID.
 */
export async function getWhiteboard(id: number, userId: string) {
  const [board] = await db
    .select()
    .from(whiteboards)
    .where(eq(whiteboards.id, id));

if (!board || board.userId !== userId) return null;

  return board;
}

/**
 * Create a new whiteboard.
 */
export async function createWhiteboard(values: NewWhiteboard) {
  const [created] = await db.insert(whiteboards).values(values).returning();
  return created;
}

/**
 * Update any fields of a whiteboard.
 */
export async function updateWhiteboard(
  id: number,
  values: Partial<NewWhiteboard>
) {
  const [updated] = await db
    .update(whiteboards)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(whiteboards.id, id))
    .returning();

  return updated;
}

/**
 * Delete a whiteboard by ID.
 */
export async function deleteWhiteboard(id: number) {
  await db.delete(whiteboards).where(eq(whiteboards.id, id));
  return true;
}