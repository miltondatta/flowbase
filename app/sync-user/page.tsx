import { redirect } from "next/navigation";

import { syncCurrentUser } from "@/lib/sync-user";

export default async function SyncUserPage() {
  await syncCurrentUser();

  redirect("/");
}
