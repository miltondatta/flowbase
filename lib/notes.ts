import { and, eq } from "drizzle-orm";

import { db, notes } from "@/db";
import type { NoteContent, User } from "@/db";

export const noteColors = [
  "#54a8ff",
  "#68d8bd",
  "#ff8c67",
  "#f4b942",
  "#9b8cff",
  "#ef6f91",
] as const;

export const defaultNoteContent: NoteContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
    },
  ],
};

export type NotePayload = {
  title?: string;
  contentJson?: unknown;
  plainText?: string | null;
  color?: string;
  isPinned?: boolean;
  isTrashed?: boolean;
};

export type RefineAction =
  | "improve-grammar"
  | "rephrase"
  | "make-shorter"
  | "make-longer"
  | "simplify-language"
  | "change-tone";

export function normalizeTitle(title?: string | null) {
  return title?.trim() || "Untitled";
}

export function normalizeColor(color?: string | null): string {
  return noteColors.includes(color as (typeof noteColors)[number])
    ? String(color)
    : noteColors[3];
}

export function normalizeContentJson(contentJson: unknown): NoteContent {
  if (
    contentJson &&
    typeof contentJson === "object" &&
    "type" in contentJson &&
    (contentJson as { type?: unknown }).type === "doc"
  ) {
    return contentJson as NoteContent;
  }

  return defaultNoteContent;
}

export function normalizePlainText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

export function buildNoteCreateValues(payload: NotePayload, userId: number) {
  return {
    userId,
    title: normalizeTitle(payload.title),
    contentJson: normalizeContentJson(payload.contentJson),
    plainText: normalizePlainText(payload.plainText),
    color: normalizeColor(payload.color),
    isPinned: Boolean(payload.isPinned),
  };
}

export function buildNoteUpdateValues(payload: NotePayload) {
  const values: Partial<typeof notes.$inferInsert> = {
    updatedAt: new Date(),
  };

  if ("title" in payload) {
    values.title = normalizeTitle(payload.title);
  }

  if ("contentJson" in payload) {
    values.contentJson = normalizeContentJson(payload.contentJson);
  }

  if ("plainText" in payload) {
    values.plainText = normalizePlainText(payload.plainText);
  }

  if ("color" in payload) {
    values.color = normalizeColor(payload.color);
  }

  if ("isPinned" in payload) {
    values.isPinned = Boolean(payload.isPinned);
  }

  if ("isTrashed" in payload) {
    values.isTrashed = Boolean(payload.isTrashed);
    values.trashedAt = payload.isTrashed ? new Date() : null;
  }

  return values;
}

export async function getUserNote(noteId: number, user: User) {
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)));

  return note || null;
}

export function refineSelectedText(text: string, action: RefineAction) {
  const trimmed = text.replace(/\s+/g, " ").trim();

  if (!trimmed) {
    return "";
  }

  const sentence = trimmed.endsWith(".") ? trimmed : `${trimmed}.`;

  switch (action) {
    case "improve-grammar":
      return sentence.charAt(0).toUpperCase() + sentence.slice(1);
    case "rephrase":
      return `In other words, ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
    case "make-shorter":
      return trimmed.length > 96 ? `${trimmed.slice(0, 93).trim()}...` : trimmed;
    case "make-longer":
      return `${sentence} This gives the idea a little more context while keeping the original meaning intact.`;
    case "simplify-language":
      return `Simply put, ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
    case "change-tone":
      return `With a warmer tone: ${sentence}`;
    default:
      return sentence;
  }
}
