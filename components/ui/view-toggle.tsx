"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";

export interface ViewToggleProps {
  value: "grid" | "list";
  onChange: (v: "grid" | "list") => void;
  className?: string;
}

export function ViewToggle({
  value,
  onChange,
  className,
}: ViewToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-md border border-[var(--flow-border)] bg-white overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={cn(
          "px-2 py-1.5 flex items-center gap-1 text-sm transition",
          value === "grid"
            ? "bg-[var(--flow-mint-light)] text-[var(--flow-mint-dark)]"
            : "text-[var(--flow-muted)] hover:bg-[var(--flow-panel)]"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "px-2 py-1.5 flex items-center gap-1 text-sm transition",
          value === "list"
            ? "bg-[var(--flow-mint-light)] text-[var(--flow-mint-dark)]"
            : "text-[var(--flow-muted)] hover:bg-[var(--flow-panel)]"
        )}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}