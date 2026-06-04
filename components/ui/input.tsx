"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, iconLeft, iconRight, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative flex w-full items-center rounded-lg border border-[var(--flow-border)] bg-white text-sm shadow-sm transition focus-within:border-[var(--flow-mint)] focus-within:ring-2 focus-within:ring-[var(--flow-mint-light)]"
        )}
      >
        {iconLeft && (
          <div className="absolute left-3 text-[var(--flow-muted)] flex items-center">
            {iconLeft}
          </div>
        )}

        <input
          type={type}
          className={cn(
            "w-full rounded-lg bg-transparent py-2 px-3 text-[var(--flow-ink)] placeholder:text-[var(--flow-soft)] focus:outline-none",
            iconLeft && "pl-10",
            iconRight && "pr-10",
            className
          )}
          ref={ref}
          {...props}
        />

        {iconRight && (
          <div className="absolute right-3 text-[var(--flow-muted)] flex items-center">
            {iconRight}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };