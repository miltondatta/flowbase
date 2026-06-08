"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface ModalContextProps {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const ModalContext = React.createContext<ModalContextProps | null>(null);

export function Modal({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <ModalContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </ModalContext.Provider>
  );
}

export function ModalTrigger({
  children,
  asChild = false,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const ctx = React.useContext(ModalContext);
  if (!ctx) throw new Error("ModalTrigger must be used inside <Modal>");

  const Comp = asChild ? Slot : "button";
  
  return (
    <Comp 
      type={asChild ? undefined : "button"}
      onClick={() => ctx.setOpen(true)}
    >
      {children}
    </Comp>
  );
}

export function ModalOverlay() {
  const ctx = React.useContext(ModalContext);
  if (!ctx) throw new Error("ModalOverlay must be used inside <Modal>");
  if (!ctx.open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
  );
}

export function ModalContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(ModalContext);
  if (!ctx) throw new Error("ModalContent must be used inside <Modal>");
  if (!ctx.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={cn(
          "w-full max-w-lg rounded-xl bg-white shadow-xl border border-[var(--flow-border)] p-6 animate-fadeIn",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-[var(--flow-ink)]">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-[var(--flow-muted)] mt-1">
          {description}
        </p>
      )}
    </div>
  );
}

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-6 flex justify-end gap-3", className)}>
      {children}
    </div>
  );
}