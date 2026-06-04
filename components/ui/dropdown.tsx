"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextProps {
  open: boolean;
  setOpen: (state: boolean) => void;
}

const DropdownContext = React.createContext<DropdownContextProps | null>(null);

export function Dropdown({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className={cn("relative inline-block text-left", className)}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownTrigger must be used within <Dropdown>");

  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--flow-muted)] hover:bg-[var(--flow-panel)] transition",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenu({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenu must be used within <Dropdown>");

  if (!ctx.open) return null;

  return (
    <div
      className={cn(
        "absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md border border-[var(--flow-border)] bg-white shadow-lg",
        className
      )}
    >
      <div className="py-1">{children}</div>
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  className,
  danger,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center px-3 py-2 text-sm text-left transition",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-[var(--flow-muted)] hover:bg-[var(--flow-panel)] hover:text-[var(--flow-ink)]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-[var(--flow-border)]" />;
}