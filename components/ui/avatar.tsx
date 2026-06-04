"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg";
  fallback?: string;
}

export function Avatar({
  src,
  alt,
  size = "md",
  fallback,
  className,
  ...props
}: AvatarProps) {
  const sizes: Record<string, string> = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
  };

  const fallbackText = fallback
    ? fallback.slice(0, 2).toUpperCase()
    : alt
    ? alt.slice(0, 2).toUpperCase()
    : "??";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full bg-[var(--flow-soft-bg)] text-[var(--flow-muted)] overflow-hidden select-none",
        sizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || "avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-medium">{fallbackText}</span>
      )}
    </div>
  );
}

export function AvatarGroup({
  children,
  limit = 4,
  className,
}: {
  children: React.ReactNode;
  limit?: number;
  className?: string;
}) {
  const items = React.Children.toArray(children);
  const extra = items.length - limit;

  return (
    <div className={cn("flex items-center -space-x-3", className)}>
      {items.slice(0, limit)}
      {extra > 0 && (
        <div className="h-8 w-8 rounded-full bg-[var(--flow-soft-bg)] text-[var(--flow-muted)] flex items-center justify-center text-xs font-medium border border-[var(--flow-border)]">
          +{extra}
        </div>
      )}
    </div>
  );
}