"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
  onClick?: () => void;
}

export function Breadcrumb({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        const content = item.href ? (
          <a
            href={item.href}
            className={cn(
              "text-[var(--flow-muted)] hover:text-[var(--flow-ink)] transition",
              isLast && "text-[var(--flow-ink)] font-medium"
            )}
          >
            {item.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={item.onClick}
            className={cn(
              "text-[var(--flow-muted)] hover:text-[var(--flow-ink)] transition",
              isLast && "text-[var(--flow-ink)] font-medium cursor-default"
            )}
          >
            {item.label}
          </button>
        );

        return (
          <React.Fragment key={index}>
            {content}

            {!isLast && (
              <ChevronRight className="h-4 w-4 text-[var(--flow-soft)]" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}