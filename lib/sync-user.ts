import { currentUser } from "@clerk/nextjs/server";

import { db, users } from "@/db";

export async function syncCurrentUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Authenticated Clerk user is missing an email address.");
  }

  const name =
    clerkUser.fullName ??
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ??
    null;

  const [syncedUser] = await db
    .insert(users)
    .values({
      clerkId: clerkUser.id,
      email,
      name: name || null,
    })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email,
        name: name || null,
      },
    })
    .returning();

  return syncedUser;
}
