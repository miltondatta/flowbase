"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { FileText, Star, MoreHorizontal } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";

export interface PageCardProps {
  id: number | string;
  name: string;
  type?: string; // Project Plan, Meeting Notes, PRD, Research Notes, etc.
  updatedAt: string;
  updatedBy?: string; // initials fallback
  avatarUrl?: string | null;
  favorited: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onMenuAction?: (action: string) => void;
}

export function PageCard({
  name,
  type = "Document",
  updatedAt,
  updatedBy,
  avatarUrl,
  favorited,
  onOpen,
  onFavorite,
  onMenuAction,
}: PageCardProps) {
  return (
    <div
      onClick={onOpen}
      className="group flex items-center justify-between rounded-lg border border-[var(--flow-border)] bg-white px-4 py-3 hover:shadow-sm transition cursor-pointer"
    >
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-md bg-[var(--flow-panel)] flex items-center justify-center text-[var(--flow-muted)]">
          <FileText className="h-4 w-4" />
        </div>

        <div>
          <p className="font-medium text-[var(--flow-ink)]">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary">{type}</Badge>
            <span className="text-xs text-[var(--flow-muted)]">
              Updated {updatedAt}
            </span>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Avatar
            size="xs"
            src={avatarUrl || undefined}
            fallback={updatedBy}
            alt={updatedBy || "User"}
          />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
          className="text-[var(--flow-muted)] hover:text-yellow-500 transition"
        >
          <Star
            className={cn(
              "h-4 w-4",
              favorited && "fill-yellow-400 text-yellow-500"
            )}
          />
        </button>

        <Dropdown>
          <DropdownTrigger>
            <MoreHorizontal className="h-5 w-5 text-[var(--flow-muted)] hover:text-[var(--flow-ink)]" />
          </DropdownTrigger>

          <DropdownMenu>
            <DropdownItem onClick={() => onMenuAction?.("rename")}>
              Rename Page
            </DropdownItem>
            <DropdownItem onClick={() => onMenuAction?.("move")}>
              Move to Space
            </DropdownItem>
            <DropdownItem onClick={() => onMenuAction?.("duplicate")}>
              Duplicate
            </DropdownItem>
            <DropdownItem onClick={() => onMenuAction?.("export")}>
              Export
            </DropdownItem>

            <DropdownSeparator />

            <DropdownItem onClick={() => onMenuAction?.("archive")} danger>
              Archive
            </DropdownItem>
            <DropdownItem onClick={() => onMenuAction?.("delete")} danger>
              Delete
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  );
}