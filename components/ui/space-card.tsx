"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Folder, Star, MoreHorizontal } from "lucide-react";
import { AvatarGroup, Avatar } from "@/components/ui/avatar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/dropdown";

export interface SpaceMember {
  id: string | number;
  name?: string;
  avatarUrl?: string | null;
}

export interface SpaceCardProps {
  id: number | string;
  name: string;
  description?: string;
  color?: string;
  members?: SpaceMember[];
  pageCount: number;
  updatedAt: string;
  favorited: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onMenuAction?: (action: string) => void;
}

export function SpaceCard({
  name,
  description,
  color = "#8b5cf6",
  members = [],
  pageCount,
  updatedAt,
  favorited,
  onOpen,
  onFavorite,
  onMenuAction,
}: SpaceCardProps) {
  return (
    <div
      onClick={onOpen}
      className="group relative flex flex-col rounded-xl border border-[var(--flow-border)] bg-white p-4 shadow-sm hover:shadow-md transition cursor-pointer"
    >
      {/* Top Bar */}
      <div className="flex items-start justify-between">
        <div
          className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow"
          style={{ backgroundColor: color }}
        >
          <Folder className="h-5 w-5" />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className="text-[var(--flow-muted)] hover:text-yellow-500 transition"
          >
            <Star
              className={cn(
                "h-5 w-5",
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
                Rename Space
              </DropdownItem>
              <DropdownItem onClick={() => onMenuAction?.("color")}>
                Change Color
              </DropdownItem>
              <DropdownItem onClick={() => onMenuAction?.("invite")}>
                Invite Collaborators
              </DropdownItem>
              <DropdownItem onClick={() => onMenuAction?.("duplicate")}>
                Duplicate
              </DropdownItem>

              <DropdownSeparator />

              <DropdownItem
                onClick={() => onMenuAction?.("archive")}
                danger
              >
                Archive
              </DropdownItem>
              <DropdownItem
                onClick={() => onMenuAction?.("delete")}
                danger
              >
                Delete
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* Title + Description */}
      <div className="mt-4">
        <h3 className="font-semibold text-[var(--flow-ink)] text-base">
          {name}
        </h3>

        {description && (
          <p className="text-sm text-[var(--flow-muted)] mt-1 line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <AvatarGroup>
          {members.map((m) => (
            <Avatar
              key={m.id}
              src={m.avatarUrl || undefined}
              alt={m.name || "User"}
              size="xs"
              fallback={m.name}
            />
          ))}
        </AvatarGroup>

        <div className="text-xs text-[var(--flow-muted)] text-right">
          {pageCount} pages • Updated {updatedAt}
        </div>
      </div>
    </div>
  );
}