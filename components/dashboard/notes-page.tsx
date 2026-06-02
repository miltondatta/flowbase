"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { TextStyle } from "@tiptap/extension-text-style";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  CheckSquare,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MoreHorizontal,
  Palette,
  Pin,
  PinOff,
  Plus,
  Quote,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Strikethrough,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Wand2,
} from "lucide-react";
import { Mic } from "lucide-react";
import { useAssemblyAIStreaming } from "@/hooks/useAssemblyAIStreaming";

import { cn } from "@/lib/utils";

type NoteContent = JSONContent;

type Note = {
  id: number;
  title: string;
  contentJson: NoteContent;
  plainText: string;
  color: string;
  isPinned: boolean;
  isTrashed: boolean;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type RefineAction =
  | "improve-grammar"
  | "rephrase"
  | "make-shorter"
  | "make-longer"
  | "simplify-language"
  | "change-tone";

const defaultContent: NoteContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const noteColors = ["#54a8ff", "#68d8bd", "#ff8c67", "#f4b942", "#9b8cff", "#ef6f91"];

const slashCommands = [
  {
    label: "Heading 1",
    icon: Heading1,
    run: (editor: Editor) =>
      editor.chain().focus().deleteRange(currentSlashRange(editor)).setNode("heading", { level: 1 }).run(),
  },
  {
    label: "Heading 2",
    icon: Heading2,
    run: (editor: Editor) =>
      editor.chain().focus().deleteRange(currentSlashRange(editor)).setNode("heading", { level: 2 }).run(),
  },
  {
    label: "Bullet list",
    icon: List,
    run: (editor: Editor) =>
      editor.chain().focus().deleteRange(currentSlashRange(editor)).toggleBulletList().run(),
  },
  {
    label: "Numbered list",
    icon: ListOrdered,
    run: (editor: Editor) =>
      editor.chain().focus().deleteRange(currentSlashRange(editor)).toggleOrderedList().run(),
  },
  {
    label: "To-do list",
    icon: CheckSquare,
    run: (editor: Editor) =>
      editor.chain().focus().deleteRange(currentSlashRange(editor)).toggleTaskList().run(),
  },
  {
    label: "Quote",
    icon: Quote,
    run: (editor: Editor) =>
      editor.chain().focus().deleteRange(currentSlashRange(editor)).toggleBlockquote().run(),
  },
  {
    label: "Code block",
    icon: Code2,
    run: (editor: Editor) =>
      editor.chain().focus().deleteRange(currentSlashRange(editor)).toggleCodeBlock().run(),
  },
];

const refineOptions: { label: string; action: RefineAction }[] = [
  { label: "Improve grammar", action: "improve-grammar" },
  { label: "Rephrase", action: "rephrase" },
  { label: "Make shorter", action: "make-shorter" },
  { label: "Make longer", action: "make-longer" },
  { label: "Simplify language", action: "simplify-language" },
  { label: "Change tone", action: "change-tone" },
];

function currentSlashRange(editor: Editor) {
  const { from } = editor.state.selection;

  return { from: Math.max(1, from - 1), to: from };
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [actionNoteId, setActionNoteId] = useState<number | null>(null);
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [bubblePosition, setBubblePosition] = useState<{ left: number; top: number } | null>(null);
  const [titleDraft, setTitleDraft] = useState("Untitled");
  const saveTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const skipNextEditorUpdate = useRef(false);

  const activeNotes = useMemo(
    () => notes.filter((note) => note.isTrashed === showTrash),
    [notes, showTrash]
  );

  const filteredNotes = useMemo(() => {
    const term = search.trim().toLowerCase();
    const visible = term
      ? activeNotes.filter(
          (note) =>
            note.title.toLowerCase().includes(term) ||
            note.plainText.toLowerCase().includes(term)
        )
      : activeNotes;

    return [...visible].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [activeNotes, search]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const {
    start: startRecording,
    stop: stopRecording,
    isRecording,
  } = useAssemblyAIStreaming({
    onPartial: (text) => {
      // TODO: live partial transcript preview UI
    },
    onFinal: (text) => {
      if (editor) {
        editor.chain().focus().insertContent(text + " ").run();
        scheduleSave({
          contentJson: editor.getJSON(),
          plainText: editor.getText(),
        });
      }
    },
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: {
            class: "flow-note-code-block",
          },
        },
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder: "Press / for commands",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "flow-note-link",
        },
      }),
      TextStyle,
      Color,
      Underline,
      Typography,
      TaskList.configure({
        HTMLAttributes: {
          class: "flow-note-task-list",
        },
      }),
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: defaultContent,
    editorProps: {
      attributes: {
        class:
          "flow-note-editor min-h-[520px] px-6 py-7 text-[15px] leading-7 text-[var(--flow-ink)] outline-none sm:px-9 lg:px-12",
      },
    },
    onUpdate: ({ editor }) => {
      if (skipNextEditorUpdate.current) {
        skipNextEditorUpdate.current = false;
        return;
      }

      const textBeforeCursor = editor.state.doc.textBetween(
        Math.max(0, editor.state.selection.from - 1),
        editor.state.selection.from,
        "\n"
      );

      setIsSlashOpen(textBeforeCursor === "/");
      scheduleSave({
        contentJson: editor.getJSON() as NoteContent,
        plainText: editor.getText(),
      });

    },
    onSelectionUpdate: ({ editor }) => {
      const { empty, from } = editor.state.selection;

      if (empty) {
        setBubblePosition(null);
        setIsAiMenuOpen(false);
        return;
      }

      const rect = editor.view.coordsAtPos(from);
      setBubblePosition({
        left: Math.max(12, rect.left),
        top: Math.max(12, rect.top - 44),
      });
    },
  });

  useEffect(() => {
    loadNotes();

    return () => {
      Object.values(saveTimersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!selectedNote || !editor) {
      return;
    }

    setTitleDraft(selectedNote.title);
    skipNextEditorUpdate.current = true;
    editor.commands.setContent(selectedNote.contentJson || defaultContent);
    setIsSlashOpen(false);
    setIsAiMenuOpen(false);
  }, [editor, selectedNote?.id]);

  async function loadNotes(nextSelectedNoteId?: number) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notes", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Sign in to load your notes.");
      }

      const data = (await response.json()) as { notes: Note[] };
      setNotes(data.notes);
      setSelectedNoteId((current) => {
        if (nextSelectedNoteId && data.notes.some((note) => note.id === nextSelectedNoteId)) {
          return nextSelectedNoteId;
        }

        if (current && data.notes.some((note) => note.id === current && !note.isTrashed)) {
          return current;
        }

        return data.notes.find((note) => !note.isTrashed)?.id || data.notes[0]?.id || null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load notes.");
    } finally {
      setIsLoading(false);
    }
  }

  async function createNote() {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled",
          color: noteColors[notes.length % noteColors.length],
          contentJson: defaultContent,
          plainText: "",
        }),
      });

      const data = (await response.json()) as { note?: Note; error?: string };

      if (!response.ok || !data.note) {
        throw new Error(data.error || "Unable to create note.");
      }

      setNotes((current) => [data.note!, ...current]);
      setSelectedNoteId(data.note.id);
      setShowTrash(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create note.");
    } finally {
      setIsCreating(false);
    }
  }

  function scheduleSave(
    values: Partial<Pick<Note, "title" | "contentJson" | "plainText" | "color" | "isPinned" | "isTrashed">>,
    noteId = selectedNote?.id
  ) {
    if (!noteId) {
      return;
    }

    setNotes((current) =>
      current.map((note) =>
        note.id === noteId
          ? { ...note, ...values, updatedAt: new Date().toISOString() }
          : note
      )
    );
    setSaveStatus("saving");

    if (saveTimersRef.current[noteId]) {
      clearTimeout(saveTimersRef.current[noteId]);
    }

    saveTimersRef.current[noteId] = setTimeout(() => {
      saveNote(noteId, values);
    }, 650);
  }

  async function saveNote(noteId: number, values: object) {
    delete saveTimersRef.current[noteId];

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { note?: Note; error?: string };

      if (!response.ok || !data.note) {
        throw new Error(data.error || "Unable to save note.");
      }

      setNotes((current) =>
        current.map((note) => (note.id === data.note!.id ? data.note! : note))
      );
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1800);
    } catch (saveError) {
      setSaveStatus("error");
      setError(saveError instanceof Error ? saveError.message : "Unable to save note.");
    }
  }

  function updateTitle(event: FormEvent<HTMLInputElement>) {
    const value = event.currentTarget.value;

    setTitleDraft(value);
    scheduleSave({ title: value });
  }

  async function duplicateNote(note: Note) {
    setActionNoteId(null);
    setError(null);

    try {
      const response = await fetch(`/api/notes/${note.id}/duplicate`, {
        method: "POST",
      });
      const data = (await response.json()) as { note?: Note; error?: string };

      if (!response.ok || !data.note) {
        throw new Error(data.error || "Unable to duplicate note.");
      }

      setNotes((current) => [data.note!, ...current]);
      setSelectedNoteId(data.note.id);
      setShowTrash(false);
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Unable to duplicate note.");
    }
  }

  async function deleteNote(note: Note) {
    setActionNoteId(null);
    setError(null);

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        note?: Note;
        deleted?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete note.");
      }

      if (data.deleted) {
        setNotes((current) => current.filter((item) => item.id !== note.id));
        setSelectedNoteId((current) => (current === note.id ? null : current));
        return;
      }

      if (data.note) {
        setNotes((current) =>
          current.map((item) => (item.id === data.note!.id ? data.note! : item))
        );
        setSelectedNoteId((current) =>
          current === note.id
            ? notes.find((item) => !item.isTrashed && item.id !== note.id)?.id || null
            : current
        );
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete note.");
    }
  }

  async function restoreNote(note: Note) {
    setActionNoteId(null);
    setSelectedNoteId(note.id);
    setShowTrash(false);
    await saveNote(note.id, { isTrashed: false });
  }

  function applyLink() {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Paste a link", previousUrl || "https://");

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  async function refineSelection(action: RefineAction) {
    if (!editor) {
      return;
    }

    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");

    if (!text.trim()) {
      return;
    }

    setIsRefining(true);

    try {
      const response = await fetch("/api/notes/ai-refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text }),
      });
      const data = (await response.json()) as { text?: string; error?: string };

      if (!response.ok || !data.text) {
        throw new Error(data.error || "Unable to refine text.");
      }

      editor.chain().focus().insertContentAt({ from, to }, data.text).run();
      setIsAiMenuOpen(false);
    } catch (refineError) {
      setError(refineError instanceof Error ? refineError.message : "Unable to refine text.");
    } finally {
      setIsRefining(false);
    }
  }

  const trashCount = notes.filter((note) => note.isTrashed).length;
  const selectedWordCount = wordCount(selectedNote?.plainText || editor?.getText() || "");

  return (
    <section className="min-w-0 flex-1 px-3 py-4 sm:px-5 lg:px-7">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        {error && (
          <div className="rounded-lg border border-coral-100 bg-coral-50 px-4 py-3 text-[13px] font-medium text-coral-700">
            {error}
          </div>
        )}

        <div className="grid min-h-[calc(100vh-2rem)] gap-4 xl:grid-cols-[328px_minmax(0,1fr)]">
          <aside className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--flow-border)] bg-white shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
            <div className="border-b border-[var(--flow-border)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--flow-muted)]">
                    <FileText className="h-4 w-4 text-amber-500" />
                    Workspace notes
                  </p>
                  <h1 className="truncate text-[22px] font-semibold text-[var(--flow-ink)]">
                    Notes
                  </h1>
                </div>
                <button
                  className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[var(--flow-ink)] px-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(47,61,84,0.16)] disabled:opacity-60"
                  disabled={isCreating}
                  onClick={createNote}
                  type="button"
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  New Note
                </button>
              </div>

              <label className="flex h-10 items-center gap-2 rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] px-3 text-[13px] text-[var(--flow-muted)] focus-within:border-[var(--flow-mint)]">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  className="min-w-0 flex-1 bg-transparent font-medium text-[var(--flow-ink)] outline-none placeholder:text-[var(--flow-soft)]"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search notes"
                  value={search}
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {isLoading ? (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--flow-panel)] px-3 py-4 text-[13px] font-semibold text-[var(--flow-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading notes
                </div>
              ) : filteredNotes.length > 0 ? (
                <div className="space-y-2">
                  {filteredNotes.map((note) => (
                    <NoteRow
                      actionNoteId={actionNoteId}
                      isSelected={note.id === selectedNoteId}
                      key={note.id}
                      note={note}
                      onChangeColor={(color) => {
                        setSelectedNoteId(note.id);
                        scheduleSave({ color }, note.id);
                      }}
                      onDelete={() => deleteNote(note)}
                      onDuplicate={() => duplicateNote(note)}
                      onRestore={() => restoreNote(note)}
                      onSelect={() => setSelectedNoteId(note.id)}
                      onToggleActions={() =>
                        setActionNoteId((current) => (current === note.id ? null : note.id))
                      }
                      onTogglePinned={() => {
                        setSelectedNoteId(note.id);
                        scheduleSave({ isPinned: !note.isPinned }, note.id);
                      }}
                      showTrash={showTrash}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[var(--flow-border)] bg-[var(--flow-panel)] px-4 py-9 text-center">
                  <Sparkles className="mx-auto mb-2 h-5 w-5 text-violet-500" />
                  <p className="text-[13px] font-semibold text-[var(--flow-ink)]">
                    {showTrash ? "Trash is empty" : "No notes found"}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--flow-muted)]">
                    {showTrash ? "Deleted notes will collect here." : "Create a note and start writing."}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--flow-border)] p-3">
              <button
                className={cn(
                  "flex h-10 w-full items-center justify-between gap-3 rounded-lg px-3 text-[13px] font-semibold transition",
                  showTrash
                    ? "bg-coral-50 text-coral-700"
                    : "bg-[var(--flow-panel)] text-[var(--flow-muted)] hover:text-[var(--flow-ink)]"
                )}
                onClick={() => {
                  setShowTrash((current) => !current);
                  setSelectedNoteId(null);
                }}
                type="button"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Trash
                </span>
                <span>{trashCount}</span>
              </button>
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-lg border border-[var(--flow-border)] bg-white shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
            {selectedNote && editor ? (
              <div className="flex h-full min-h-[680px] flex-col">
                <div className="border-b border-[var(--flow-border)] bg-white/95 px-4 py-3 backdrop-blur">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span
                        className="mt-2 h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: selectedNote.color }}
                      />
                      <input
                        className="min-w-0 flex-1 bg-transparent text-[28px] font-semibold leading-9 text-[var(--flow-ink)] outline-none placeholder:text-[var(--flow-soft)]"
                        onInput={updateTitle}
                        placeholder="Untitled"
                        value={titleDraft}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[var(--flow-muted)]">
                      <span className="rounded-md bg-[var(--flow-panel)] px-2 py-1">
                        {selectedWordCount} words
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-1",
                          saveStatus === "error"
                            ? "bg-coral-50 text-coral-700"
                            : "bg-mint-50 text-mint-700"
                        )}
                      >
                        {saveStatus === "saving"
                          ? "Saving..."
                          : saveStatus === "error"
                            ? "Save failed"
                            : saveStatus === "saved"
                              ? "Saved just now"
                              : "Saved"}
                      </span>
                    </div>
                  </div>

                  <Toolbar
  editor={editor}
  onLink={applyLink}
  isRecording={isRecording}
  startRecording={startRecording}
  stopRecording={stopRecording}
/>
                </div>

                <div className="relative min-h-0 flex-1 overflow-y-auto bg-[#fffdf8]">
                  {bubblePosition && (
                    <div
                      className="fixed z-50 flex items-center gap-1 rounded-lg border border-[var(--flow-border)] bg-white p-1 shadow-[0_18px_48px_rgba(47,61,84,0.18)]"
                      style={{
                        left: bubblePosition.left,
                        top: bubblePosition.top,
                      }}
                    >
                      <BubbleButton
                        active={editor.isActive("bold")}
                        icon={<Bold className="h-3.5 w-3.5" />}
                        label="Bold"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                      />
                      <BubbleButton
                        active={editor.isActive("italic")}
                        icon={<Italic className="h-3.5 w-3.5" />}
                        label="Italic"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                      />
                      <div className="relative">
                        <button
                          className="flex h-8 items-center gap-1.5 rounded-md bg-[var(--flow-ink)] px-2.5 text-[12px] font-semibold text-white"
                          disabled={isRefining}
                          onClick={() => setIsAiMenuOpen((current) => !current)}
                          type="button"
                        >
                          {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                          AI Refine
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        {isAiMenuOpen && (
                          <div className="absolute left-0 top-10 z-20 grid w-44 gap-1 rounded-lg border border-[var(--flow-border)] bg-white p-1 shadow-[0_18px_48px_rgba(47,61,84,0.18)]">
                            {refineOptions.map((option) => (
                              <button
                                className="rounded-md px-2 py-1.5 text-left text-[12px] font-semibold text-[var(--flow-muted)] transition hover:bg-[var(--flow-panel)] hover:text-[var(--flow-ink)]"
                                key={option.action}
                                onClick={() => refineSelection(option.action)}
                                type="button"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isSlashOpen && (
                    <div className="absolute left-8 top-24 z-10 w-56 rounded-lg border border-[var(--flow-border)] bg-white p-1 shadow-[0_18px_48px_rgba(47,61,84,0.15)] sm:left-14">
                      {slashCommands.map((command) => {
                        const Icon = command.icon;

                        return (
                          <button
                            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-semibold text-[var(--flow-muted)] transition hover:bg-[var(--flow-panel)] hover:text-[var(--flow-ink)]"
                            key={command.label}
                            onClick={() => {
                              command.run(editor);
                              setIsSlashOpen(false);
                            }}
                            type="button"
                          >
                            <Icon className="h-4 w-4" />
                            {command.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <EditorContent editor={editor} />
                </div>
              </div>
            ) : (
              <div className="grid min-h-[680px] place-items-center bg-[#fffdf8] px-6 text-center">
                <div className="max-w-sm">
                  <FileText className="mx-auto mb-3 h-8 w-8 text-amber-500" />
                  <h2 className="text-[22px] font-semibold text-[var(--flow-ink)]">
                    {showTrash ? "Select a trashed note" : "Choose a note"}
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-[var(--flow-muted)]">
                    {showTrash
                      ? "Restore a note or permanently delete it from the actions menu."
                      : "Pick a note from the panel or create a fresh page to start writing."}
                  </p>
                  {!showTrash && (
                    <button
                      className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--flow-ink)] px-4 text-[13px] font-semibold text-white"
                      onClick={createNote}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      New Note
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function Toolbar({
  editor,
  onLink,
  isRecording,
  startRecording,
  stopRecording,
}: {
  editor: Editor;
  onLink: () => void;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
}) {
  const tools = [
    {
      label: "Text",
      icon: Type,
      active: editor.isActive("paragraph"),
      onClick: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: "H1",
      icon: Heading1,
      active: editor.isActive("heading", { level: 1 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "H2",
      icon: Heading2,
      active: editor.isActive("heading", { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Bold",
      icon: Bold,
      active: editor.isActive("bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: editor.isActive("italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Underline",
      icon: UnderlineIcon,
      active: editor.isActive("underline"),
      onClick: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: "Strike",
      icon: Strikethrough,
      active: editor.isActive("strike"),
      onClick: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "Bullets",
      icon: List,
      active: editor.isActive("bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbers",
      icon: ListOrdered,
      active: editor.isActive("orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Tasks",
      icon: CheckSquare,
      active: editor.isActive("taskList"),
      onClick: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: "Quote",
      icon: Quote,
      active: editor.isActive("blockquote"),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      label: "Code",
      icon: Code2,
      active: editor.isActive("code"),
      onClick: () => editor.chain().focus().toggleCode().run(),
    },
  ];

  return (
    <div className="mt-3 flex items-center gap-1 overflow-x-auto rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] p-1">
      {tools.map((tool) => {
        const Icon = tool.icon;

        return (
          <button
            aria-label={tool.label}
            className={cn(
              "grid h-8 min-w-8 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-white hover:text-[var(--flow-ink)]",
              tool.active && "bg-white text-[var(--flow-ink)] shadow-[0_6px_16px_rgba(47,61,84,0.08)]"
            )}
            key={tool.label}
            onClick={tool.onClick}
            title={tool.label}
            type="button"
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
      <button
        aria-label="Link"
        className={cn(
          "grid h-8 min-w-8 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-white hover:text-[var(--flow-ink)]",
          editor.isActive("link") && "bg-white text-[var(--flow-ink)]"
        )}
        onClick={onLink}
        title="Link"
        type="button"
      >
        <Link2 className="h-4 w-4" />
      </button>
      <button
        aria-label="Speak to Note"
        className={cn(
          "grid h-8 min-w-8 place-items-center rounded-md transition hover:bg-white",
          isRecording
            ? "text-red-600 animate-pulse bg-white shadow-[0_6px_16px_rgba(255,0,0,0.25)]"
            : "text-[var(--flow-muted)] hover:text-[var(--flow-ink)]"
        )}
        onClick={isRecording ? stopRecording : startRecording}
        title="Speak to Note"
        type="button"
      >
        <Mic className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px shrink-0 bg-[var(--flow-border)]" />
      <button
        className="grid h-8 min-w-8 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-white hover:text-[var(--flow-ink)]"
        onClick={() => editor.chain().focus().setColor("#f4b942").run()}
        title="Amber text"
        type="button"
      >
        <Highlighter className="h-4 w-4 text-amber-500" />
      </button>
      <button
        className="grid h-8 min-w-8 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-white hover:text-[var(--flow-ink)]"
        onClick={() => editor.chain().focus().unsetColor().run()}
        title="Clear color"
        type="button"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  );
}

function BubbleButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-[var(--flow-panel)] hover:text-[var(--flow-ink)]",
        active && "bg-[var(--flow-panel)] text-[var(--flow-ink)]"
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function NoteRow({
  actionNoteId,
  isSelected,
  note,
  onChangeColor,
  onDelete,
  onDuplicate,
  onRestore,
  onSelect,
  onToggleActions,
  onTogglePinned,
  showTrash,
}: {
  actionNoteId: number | null;
  isSelected: boolean;
  note: Note;
  onChangeColor: (color: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRestore: () => void;
  onSelect: () => void;
  onToggleActions: () => void;
  onTogglePinned: () => void;
  showTrash: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative rounded-lg border p-3 transition",
        isSelected
          ? "border-[var(--flow-mint)] bg-mint-50 shadow-[0_10px_24px_rgba(47,61,84,0.08)]"
          : "border-[var(--flow-border)] bg-white hover:bg-[#fffdf8]"
      )}
    >
      <button className="flex w-full min-w-0 gap-3 text-left" onClick={onSelect} type="button">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
          style={{ backgroundColor: note.color }}
        >
          <FileText className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-[var(--flow-ink)]">
              {note.title}
            </span>
            {note.isPinned && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />}
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-2 text-[11px] font-semibold text-[var(--flow-muted)]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: note.color }}
            />
            <span className="truncate">
              {showTrash ? "Trashed" : `Updated ${formatUpdatedAt(note.updatedAt)}`}
            </span>
          </span>
        </span>
      </button>

      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
        {!showTrash && (
          <button
            className="grid h-7 w-7 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-white hover:text-[var(--flow-ink)]"
            onClick={onTogglePinned}
            title={note.isPinned ? "Unpin note" : "Pin note"}
            type="button"
          >
            {note.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
        )}
        <button
          className="grid h-7 w-7 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-white hover:text-[var(--flow-ink)]"
          onClick={onToggleActions}
          title="Note actions"
          type="button"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {actionNoteId === note.id && (
        <div className="absolute right-2 top-10 z-20 w-48 rounded-lg border border-[var(--flow-border)] bg-white p-1 shadow-[0_18px_48px_rgba(47,61,84,0.16)]">
          {showTrash ? (
            <button
              className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-semibold text-[var(--flow-muted)] hover:bg-[var(--flow-panel)] hover:text-[var(--flow-ink)]"
              onClick={onRestore}
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              Restore note
            </button>
          ) : (
            <>
              <button
                className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-semibold text-[var(--flow-muted)] hover:bg-[var(--flow-panel)] hover:text-[var(--flow-ink)]"
                onClick={onDuplicate}
                type="button"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </button>
              <div className="px-2 py-2">
                <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[var(--flow-muted)]">
                  <Palette className="h-3.5 w-3.5" />
                  Color
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {noteColors.map((color) => (
                    <button
                      aria-label={`Set note color ${color}`}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(47,61,84,0.12)]",
                        note.color === color && "shadow-[0_0_0_2px_var(--flow-ink)]"
                      )}
                      key={color}
                      onClick={() => onChangeColor(color)}
                      style={{ backgroundColor: color }}
                      type="button"
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          <button
            className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] font-semibold text-coral-700 hover:bg-coral-50"
            onClick={onDelete}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
            {showTrash ? "Delete forever" : "Move to Trash"}
          </button>
        </div>
      )}
    </article>
  );
}
