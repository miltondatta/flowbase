"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This nested route should not be accessed directly.
// All page viewing happens within the DashboardShell via state management.
// Redirect to /spaces to maintain single-panel navigation.
export default function PagePreviewRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/spaces");
  }, [router]);
  
  return (
    <div className="p-8">
      <p className="text-[var(--flow-muted)]">Redirecting...</p>
    </div>
  );
}

// Content removed - this file now only redirects to /spaces
// All page management happens within app/spaces/[id]/page.tsx via local state
