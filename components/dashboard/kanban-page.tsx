"use client";

import { useEffect, useMemo, useState } from "react";
import type { DragEvent, FormEvent, ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Edit3,
  FileText,
  GripVertical,
  KanbanSquare,
  Layers3,
  Loader2,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Priority = "Low" | "Medium" | "High";

type KanbanLabel = {
  name: string;
  color: string;
};

type KanbanTask = {
  id: number;
  boardId: number;
  columnId: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: Priority;
  labels: KanbanLabel[];
  syncCalendar: boolean;
  linkNotes: boolean;
  calendarTaskId: number | null;
};

type KanbanColumn = {
  id: number;
  boardId: number;
  name: string;
  orderIndex: number;
  tasks: KanbanTask[];
};

type KanbanBoard = {
  id: number;
  userId: number;
  name: string;
  color: string;
  columns: KanbanColumn[];
};

type TaskForm = {
  title: string;
  description: string;
  dueDate: string;
  priority: Priority;
  labels: KanbanLabel[];
  syncCalendar: boolean;
  linkNotes: boolean;
};

const boardColors = ["#54a8ff", "#68d8bd", "#ff8c67", "#f4b942", "#9b8cff", "#ef6f91"];

const labelOptions: KanbanLabel[] = [
  { name: "Planning", color: "#54a8ff" },
  { name: "Focus", color: "#68d8bd" },
  { name: "Personal", color: "#9b8cff" },
  { name: "Urgent", color: "#ff8c67" },
  { name: "Review", color: "#f4b942" },
];

const priorityStyles: Record<Priority, string> = {
  Low: "bg-mint-100 text-mint-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-coral-100 text-coral-700",
};

const taskDragType = "application/x-flowbase-kanban-task";
const columnDragType = "application/x-flowbase-kanban-column";

function todayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function emptyTaskForm(): TaskForm {
  return {
    title: "",
    description: "",
    dueDate: todayKey(),
    priority: "Medium",
    labels: [],
    syncCalendar: false,
    linkNotes: false,
  };
}

export function KanbanPage() {
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBoardDialogOpen, setIsBoardDialogOpen] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [boardColor, setBoardColor] = useState(boardColors[0]);
  const [newColumnName, setNewColumnName] = useState("");
  const [editingColumnId, setEditingColumnId] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [taskDialog, setTaskDialog] = useState<{
    columnId: number;
    task: KanbanTask | null;
  } | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(() => emptyTaskForm());

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) || null,
    [boards, selectedBoardId]
  );

  useEffect(() => {
    loadBoards();
  }, []);

  async function loadBoards(nextSelectedBoardId = selectedBoardId) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/kanban/boards", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Sign in to load your Kanban boards.");
      }

      const data = (await response.json()) as { boards: KanbanBoard[] };
      setBoards(data.boards);
      setSelectedBoardId((current) => {
        if (nextSelectedBoardId && data.boards.some((board) => board.id === nextSelectedBoardId)) {
          return nextSelectedBoardId;
        }

        if (current && data.boards.some((board) => board.id === current)) {
          return current;
        }

        return data.boards[0]?.id || null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load boards.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateBoard(boardId: number, updater: (board: KanbanBoard) => KanbanBoard) {
    setBoards((current) =>
      current.map((board) => (board.id === boardId ? updater(board) : board))
    );
  }

  function openTaskDialog(columnId: number, task: KanbanTask | null = null) {
    setTaskDialog({ columnId, task });
    setTaskForm(
      task
        ? {
            title: task.title,
            description: task.description || "",
            dueDate: task.dueDate || todayKey(),
            priority: task.priority,
            labels: task.labels,
            syncCalendar: task.syncCalendar,
            linkNotes: task.linkNotes,
          }
        : emptyTaskForm()
    );
  }

  async function createBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/kanban/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: boardName, color: boardColor }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to create board.");
      }

      const data = (await response.json()) as { board: KanbanBoard };
      setBoards((current) => [data.board, ...current]);
      setSelectedBoardId(data.board.id);
      setBoardName("");
      setBoardColor(boardColors[0]);
      setIsBoardDialogOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create board.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSelectedBoard() {
    if (!selectedBoard) {
      return;
    }

    const shouldDelete = window.confirm(`Delete "${selectedBoard.name}" and all of its tasks?`);

    if (!shouldDelete) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/kanban/boards/${selectedBoard.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete board.");
      }

      setBoards((current) => current.filter((board) => board.id !== selectedBoard.id));
      setSelectedBoardId((current) => {
        const remaining = boards.filter((board) => board.id !== selectedBoard.id);

        return current === selectedBoard.id ? remaining[0]?.id || null : current;
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete board.");
    } finally {
      setIsSaving(false);
    }
  }

  async function createColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedBoard || selectedBoard.columns.length >= 5) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/kanban/boards/${selectedBoard.id}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newColumnName }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to create column.");
      }

      const data = (await response.json()) as { column: KanbanColumn };
      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        columns: [...board.columns, data.column],
      }));
      setNewColumnName("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create column.");
    } finally {
      setIsSaving(false);
    }
  }

  async function renameColumn(columnId: number) {
    if (!selectedBoard) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/kanban/columns/${columnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingColumnName }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to rename column.");
      }

      const data = (await response.json()) as { column: KanbanColumn };
      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        columns: board.columns.map((column) =>
          column.id === columnId ? { ...column, name: data.column.name } : column
        ),
      }));
      setEditingColumnId(null);
      setEditingColumnName("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to rename column.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteColumn(column: KanbanColumn) {
    if (!selectedBoard) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/kanban/columns/${column.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to delete column.");
      }

      await loadBoards(selectedBoard.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete column.");
    } finally {
      setIsSaving(false);
    }
  }

  async function moveColumn(columnId: number, nextIndex: number) {
    if (!selectedBoard) {
      return;
    }

    const previousBoard = selectedBoard;
    const currentIndex = selectedBoard.columns.findIndex((column) => column.id === columnId);

    if (currentIndex === -1 || currentIndex === nextIndex) {
      return;
    }

    const nextColumns = [...selectedBoard.columns];
    const [movingColumn] = nextColumns.splice(currentIndex, 1);
    nextColumns.splice(Math.max(0, Math.min(nextIndex, nextColumns.length)), 0, movingColumn);

    updateBoard(selectedBoard.id, (board) => ({
      ...board,
      columns: nextColumns.map((column, index) => ({
        ...column,
        orderIndex: index,
      })),
    }));
    setError(null);

    try {
      const response = await fetch(`/api/kanban/columns/${columnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIndex: nextIndex }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to move column.");
      }

      const data = (await response.json()) as { columns: KanbanColumn[] };
      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        columns: data.columns.map((column) => ({
          ...column,
          tasks: board.columns.find((item) => item.id === column.id)?.tasks || [],
        })),
      }));
    } catch (moveError) {
      setBoards((current) =>
        current.map((board) => (board.id === previousBoard.id ? previousBoard : board))
      );
      setError(moveError instanceof Error ? moveError.message : "Unable to move column.");
    }
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskDialog || !selectedBoard) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      ...taskForm,
      dueDate: taskForm.dueDate || null,
    };

    try {
      const response = await fetch(
        taskDialog.task
          ? `/api/kanban/tasks/${taskDialog.task.id}`
          : `/api/kanban/columns/${taskDialog.columnId}/tasks`,
        {
          method: taskDialog.task ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to save task.");
      }

      const data = (await response.json()) as { task: KanbanTask };
      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        columns: board.columns.map((column) => {
          if (taskDialog.task) {
            return {
              ...column,
              tasks: column.tasks.map((task) => (task.id === data.task.id ? data.task : task)),
            };
          }

          return column.id === taskDialog.columnId
            ? { ...column, tasks: [data.task, ...column.tasks] }
            : column;
        }),
      }));
      setTaskDialog(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save task.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteTask(task: KanbanTask) {
    if (!selectedBoard) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/kanban/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete task.");
      }

      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          tasks: column.tasks.filter((item) => item.id !== task.id),
        })),
      }));
      setTaskDialog(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete task.");
    } finally {
      setIsSaving(false);
    }
  }

  async function moveTask(taskId: number, nextColumnId: number) {
    if (!selectedBoard) {
      return;
    }

    const previousBoard = selectedBoard;
    let movingTask: KanbanTask | null = null;

    updateBoard(selectedBoard.id, (board) => {
      const columns = board.columns.map((column) => {
        const task = column.tasks.find((item) => item.id === taskId);

        if (task) {
          movingTask = { ...task, columnId: nextColumnId };

          return {
            ...column,
            tasks: column.tasks.filter((item) => item.id !== taskId),
          };
        }

        return column;
      });

      return {
        ...board,
        columns: columns.map((column) =>
          column.id === nextColumnId && movingTask
            ? { ...column, tasks: [movingTask, ...column.tasks] }
            : column
        ),
      };
    });

    try {
      const response = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId: nextColumnId }),
      });

      if (!response.ok) {
        throw new Error("Unable to move task.");
      }

      const data = (await response.json()) as { task: KanbanTask };
      updateBoard(selectedBoard.id, (board) => ({
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) => (task.id === data.task.id ? data.task : task)),
        })),
      }));
    } catch (moveError) {
      setBoards((current) =>
        current.map((board) => (board.id === previousBoard.id ? previousBoard : board))
      );
      setError(moveError instanceof Error ? moveError.message : "Unable to move task.");
    }
  }

  function setDragData(event: DragEvent, taskId: number) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(taskDragType, String(taskId));
  }

  function handleDrop(event: DragEvent, columnId: number) {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData(taskDragType));

    if (Number.isInteger(taskId)) {
      moveTask(taskId, columnId);
    }
  }

  function setColumnDragData(event: DragEvent, columnId: number) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(columnDragType, String(columnId));
  }

  function handleColumnDrop(event: DragEvent, nextIndex: number) {
    const columnId = Number(event.dataTransfer.getData(columnDragType));

    if (!Number.isInteger(columnId)) {
      return;
    }

    event.preventDefault();
    moveColumn(columnId, nextIndex);
  }

  function toggleLabel(label: KanbanLabel) {
    setTaskForm((current) => {
      const hasLabel = current.labels.some((item) => item.name === label.name);

      return {
        ...current,
        labels: hasLabel
          ? current.labels.filter((item) => item.name !== label.name)
          : [...current.labels, label],
      };
    });
  }

  return (
    <section className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5">
        <header className="flex flex-col gap-3 rounded-lg border border-[var(--flow-border)] bg-white/85 px-4 py-3 shadow-[0_14px_40px_rgba(47,61,84,0.06)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[12px] font-semibold text-[var(--flow-muted)]">
              <KanbanSquare className="h-4 w-4 text-orange-500" />
              Task / Kanban
            </p>
            <h1 className="truncate text-[24px] font-semibold leading-8 text-[var(--flow-ink)]">
              {selectedBoard ? selectedBoard.name : "Kanban boards"}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedBoard && (
              <button
                className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--flow-border)] bg-white text-[var(--flow-muted)] transition hover:border-coral-100 hover:bg-coral-50 hover:text-coral-700"
                onClick={deleteSelectedBoard}
                title="Delete board"
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              className="flex h-9 items-center gap-2 rounded-lg bg-[var(--flow-ink)] px-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(47,61,84,0.16)]"
              onClick={() => setIsBoardDialogOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              New board
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-coral-100 bg-coral-50 px-4 py-3 text-[13px] font-medium text-coral-700">
            {error}
          </div>
        )}

        <div className="grid min-h-[680px] gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="min-w-0 rounded-lg border border-[var(--flow-border)] bg-white p-3 shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--flow-ink)]">
                  Boards
                </h2>
                <p className="text-[12px] text-[var(--flow-muted)]">
                  Create and switch workspaces.
                </p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-orange-50 text-orange-500">
                <Layers3 className="h-4 w-4" />
              </span>
            </div>

            <button
              className="mb-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--flow-border)] bg-[var(--flow-panel)] text-[13px] font-semibold text-[var(--flow-muted)] transition hover:border-[var(--flow-mint)] hover:text-[var(--flow-ink)]"
              onClick={() => setIsBoardDialogOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Create board
            </button>

            <div className="flex flex-col gap-2">
              {isLoading ? (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--flow-panel)] px-3 py-3 text-[13px] text-[var(--flow-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading boards
                </div>
              ) : boards.length > 0 ? (
                boards.map((board) => (
                  <button
                    className={cn(
                      "flex min-w-0 items-center gap-3 rounded-lg border px-3 py-3 text-left transition hover:bg-[var(--flow-panel)]",
                      board.id === selectedBoardId
                        ? "border-[var(--flow-mint)] bg-mint-50 shadow-[0_8px_22px_rgba(47,61,84,0.07)]"
                        : "border-[var(--flow-border)] bg-white"
                    )}
                    key={board.id}
                    onClick={() => setSelectedBoardId(board.id)}
                    type="button"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: board.color }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[var(--flow-ink)]">
                        {board.name}
                      </span>
                      <span className="text-[11px] text-[var(--flow-muted)]">
                        {board.columns.length} columns
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] px-3 py-5 text-center">
                  <Sparkles className="mx-auto mb-2 h-5 w-5 text-violet-500" />
                  <p className="text-[13px] font-semibold">No boards yet</p>
                  <p className="text-[12px] text-[var(--flow-muted)]">
                    Start with a cozy planning board.
                  </p>
                </div>
              )}
            </div>
          </aside>

          <section className="min-w-0 rounded-lg border border-[var(--flow-border)] bg-white shadow-[0_14px_40px_rgba(47,61,84,0.06)]">
            {selectedBoard ? (
              <div className="flex h-full min-w-0 flex-col">
                <div className="flex flex-col gap-3 border-b border-[var(--flow-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-10 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: selectedBoard.color }}
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-[17px] font-semibold text-[var(--flow-ink)]">
                        {selectedBoard.name}
                      </h2>
                      <p className="text-[12px] text-[var(--flow-muted)]">
                        Drag cards between columns. Up to 5 columns per board.
                      </p>
                    </div>
                  </div>

                  <form
                    className="flex min-w-0 flex-col gap-2 sm:flex-row"
                    onSubmit={createColumn}
                  >
                    <input
                      className="h-10 min-w-0 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium outline-none transition focus:border-[var(--flow-mint)] disabled:bg-[var(--flow-panel)]"
                      disabled={selectedBoard.columns.length >= 5 || isSaving}
                      onChange={(event) => setNewColumnName(event.target.value)}
                      placeholder={
                        selectedBoard.columns.length >= 5
                          ? "Column limit reached"
                          : "New column name"
                      }
                      value={newColumnName}
                    />
                    <button
                      className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)] px-3 text-[13px] font-semibold text-[var(--flow-muted)] transition hover:border-[var(--flow-mint)] hover:text-[var(--flow-ink)] disabled:opacity-60"
                      disabled={selectedBoard.columns.length >= 5 || isSaving}
                      type="submit"
                    >
                      <Plus className="h-4 w-4" />
                      Add column
                    </button>
                  </form>
                </div>

                <div className="min-h-0 flex-1 overflow-x-auto">
                  <div className="grid min-h-full min-w-0 grid-cols-1 gap-4 p-4 md:auto-cols-[minmax(270px,1fr)] md:grid-flow-col md:grid-cols-none">
                    {selectedBoard.columns.map((column, columnIndex) => (
                      <div
                        className="flex min-h-[360px] min-w-0 flex-col rounded-lg border border-[var(--flow-border)] bg-[var(--flow-panel)]"
                        key={column.id}
                        onDragOver={(event) => {
                          if (
                            event.dataTransfer.types.includes(taskDragType) ||
                            event.dataTransfer.types.includes(columnDragType)
                          ) {
                            event.preventDefault();
                          }
                        }}
                        onDrop={(event) => {
                          if (event.dataTransfer.types.includes(columnDragType)) {
                            handleColumnDrop(event, columnIndex);
                            return;
                          }

                          handleDrop(event, column.id);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-[var(--flow-border)] px-3 py-3">
                          {editingColumnId === column.id ? (
                            <form
                              className="flex min-w-0 flex-1 gap-2"
                              onSubmit={(event) => {
                                event.preventDefault();
                                renameColumn(column.id);
                              }}
                            >
                              <input
                                className="h-8 min-w-0 flex-1 rounded-md border border-[var(--flow-border)] bg-white px-2 text-[13px] font-semibold outline-none focus:border-[var(--flow-mint)]"
                                onChange={(event) => setEditingColumnName(event.target.value)}
                                value={editingColumnName}
                              />
                              <button
                                className="grid h-8 w-8 place-items-center rounded-md bg-white text-mint-700"
                                type="submit"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                            </form>
                          ) : (
                            <div className="min-w-0">
                              <h3 className="truncate text-[14px] font-semibold text-[var(--flow-ink)]">
                                {column.name}
                              </h3>
                              <p className="text-[11px] font-medium text-[var(--flow-muted)]">
                                {column.tasks.length} tasks
                              </p>
                            </div>
                          )}

                          <div className="flex shrink-0 items-center gap-1">
                            <span
                              className="grid h-8 w-8 cursor-grab place-items-center rounded-md bg-white text-[var(--flow-soft)] transition hover:text-[var(--flow-ink)] active:cursor-grabbing"
                              draggable
                              onDragStart={(event) => setColumnDragData(event, column.id)}
                              title="Move column"
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <button
                              className="grid h-8 w-8 place-items-center rounded-md bg-white text-[var(--flow-muted)] transition hover:text-[var(--flow-ink)]"
                              onClick={() => openTaskDialog(column.id)}
                              title="Add task"
                              type="button"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              className="grid h-8 w-8 place-items-center rounded-md bg-white text-[var(--flow-muted)] transition hover:text-[var(--flow-ink)]"
                              onClick={() => {
                                setEditingColumnId(column.id);
                                setEditingColumnName(column.name);
                              }}
                              title="Rename column"
                              type="button"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              className="grid h-8 w-8 place-items-center rounded-md bg-white text-[var(--flow-muted)] transition hover:bg-coral-50 hover:text-coral-700"
                              onClick={() => deleteColumn(column)}
                              title="Delete column"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
                          {column.tasks.length > 0 ? (
                            column.tasks.map((task) => (
                              <TaskCard
                                key={task.id}
                                onDelete={deleteTask}
                                onDragStart={setDragData}
                                onEdit={(item) => openTaskDialog(column.id, item)}
                                task={task}
                              />
                            ))
                          ) : (
                            <button
                              className="flex min-h-[130px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--flow-border)] bg-white/70 px-3 py-4 text-center text-[13px] font-semibold text-[var(--flow-muted)] transition hover:border-[var(--flow-mint)] hover:text-[var(--flow-ink)]"
                              onClick={() => openTaskDialog(column.id)}
                              type="button"
                            >
                              <Circle className="mb-2 h-5 w-5 text-[var(--flow-soft)]" />
                              Add a task
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid min-h-[520px] place-items-center px-4 py-10 text-center">
                <div>
                  <KanbanSquare className="mx-auto mb-3 h-9 w-9 text-orange-500" />
                  <h2 className="text-[18px] font-semibold text-[var(--flow-ink)]">
                    Create your first Kanban board
                  </h2>
                  <p className="mx-auto mt-1 max-w-[360px] text-[13px] text-[var(--flow-muted)]">
                    Boards open here with Todo, In Progress, and Done ready for your first tasks.
                  </p>
                  <button
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--flow-ink)] px-4 text-[13px] font-semibold text-white"
                    onClick={() => setIsBoardDialogOpen(true)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    New board
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {isBoardDialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(32,42,57,0.24)] px-4 py-6 backdrop-blur-sm">
          <form
            className="w-full max-w-[460px] rounded-lg border border-[var(--flow-border)] bg-white p-4 shadow-[0_24px_70px_rgba(47,61,84,0.22)]"
            onSubmit={createBoard}
          >
            <DialogHeader
              icon={<KanbanSquare className="h-4 w-4 text-orange-500" />}
              onClose={() => setIsBoardDialogOpen(false)}
              subtitle="Choose a clear name and a color marker for the sidebar."
              title="New board"
            />
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                Board name
                <input
                  className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                  onChange={(event) => setBoardName(event.target.value)}
                  placeholder="Launch plan"
                  required
                  value={boardName}
                />
              </label>

              <div className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                Board color
                <div className="flex flex-wrap gap-2">
                  {boardColors.map((color) => (
                    <button
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-lg border bg-white transition",
                        boardColor === color
                          ? "border-[var(--flow-ink)] shadow-[0_8px_20px_rgba(47,61,84,0.12)]"
                          : "border-[var(--flow-border)]"
                      )}
                      key={color}
                      onClick={() => setBoardColor(color)}
                      type="button"
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogActions
              isSaving={isSaving}
              onCancel={() => setIsBoardDialogOpen(false)}
              submitLabel="Create board"
            />
          </form>
        </div>
      )}

      {taskDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(32,42,57,0.24)] px-4 py-6 backdrop-blur-sm">
          <form
            className="w-full max-w-[620px] rounded-lg border border-[var(--flow-border)] bg-white p-4 shadow-[0_24px_70px_rgba(47,61,84,0.22)]"
            onSubmit={saveTask}
          >
            <DialogHeader
              icon={<Plus className="h-4 w-4 text-mint-700" />}
              onClose={() => setTaskDialog(null)}
              subtitle="Add the details that make this card easy to scan later."
              title={taskDialog.task ? "Edit task" : "New task"}
            />

            <div className="grid gap-3">
              <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                Title
                <input
                  className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                  onChange={(event) =>
                    setTaskForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Write the task title"
                  required
                  value={taskForm.title}
                />
              </label>

              <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                Description
                <textarea
                  className="min-h-[88px] resize-none rounded-lg border border-[var(--flow-border)] bg-white px-3 py-2 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Add useful context"
                  value={taskForm.description}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                  Due date
                  <input
                    className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                    onChange={(event) =>
                      setTaskForm((current) => ({ ...current, dueDate: event.target.value }))
                    }
                    type="date"
                    value={taskForm.dueDate}
                  />
                </label>

                <label className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                  Priority
                  <select
                    className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-3 text-[13px] font-medium text-[var(--flow-ink)] outline-none transition focus:border-[var(--flow-mint)]"
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        priority: event.target.value as Priority,
                      }))
                    }
                    value={taskForm.priority}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-1.5 text-[12px] font-semibold text-[var(--flow-muted)]">
                Labels
                <div className="flex flex-wrap gap-2">
                  {labelOptions.map((label) => {
                    const isSelected = taskForm.labels.some((item) => item.name === label.name);

                    return (
                      <button
                        className={cn(
                          "flex h-8 items-center gap-2 rounded-lg border px-2.5 text-[12px] font-semibold transition",
                          isSelected
                            ? "border-[var(--flow-ink)] bg-[var(--flow-panel)] text-[var(--flow-ink)]"
                            : "border-[var(--flow-border)] text-[var(--flow-muted)]"
                        )}
                        key={label.name}
                        onClick={() => toggleLabel(label)}
                        type="button"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <ToggleRow
                  checked={taskForm.syncCalendar}
                  icon={<CalendarDays className="h-4 w-4 text-emerald-500" />}
                  label="Sync with Calendar"
                  onChange={(checked) =>
                    setTaskForm((current) => ({ ...current, syncCalendar: checked }))
                  }
                />
                <ToggleRow
                  checked={taskForm.linkNotes}
                  icon={<FileText className="h-4 w-4 text-amber-500" />}
                  label="Link with Notes"
                  onChange={(checked) =>
                    setTaskForm((current) => ({ ...current, linkNotes: checked }))
                  }
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {taskDialog.task ? (
                <button
                  className="h-10 rounded-lg border border-coral-100 bg-coral-50 px-4 text-[13px] font-semibold text-coral-700 transition hover:bg-coral-100"
                  disabled={isSaving}
                  onClick={() => taskDialog.task && deleteTask(taskDialog.task)}
                  type="button"
                >
                  Delete task
                </button>
              ) : (
                <span />
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-4 text-[13px] font-semibold text-[var(--flow-muted)] transition hover:text-[var(--flow-ink)]"
                  disabled={isSaving}
                  onClick={() => setTaskDialog(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="h-10 rounded-lg bg-[var(--flow-ink)] px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(47,61,84,0.16)] disabled:opacity-60"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Saving..." : taskDialog.task ? "Update task" : "Create task"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function TaskCard({
  onDelete,
  onDragStart,
  onEdit,
  task,
}: {
  onDelete: (task: KanbanTask) => void;
  onDragStart: (event: DragEvent, taskId: number) => void;
  onEdit: (task: KanbanTask) => void;
  task: KanbanTask;
}) {
  return (
    <article
      className="group cursor-grab rounded-lg border border-[var(--flow-border)] bg-white p-3 shadow-[0_8px_22px_rgba(47,61,84,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(47,61,84,0.1)] active:cursor-grabbing"
      draggable
      onDragStart={(event) => onDragStart(event, task.id)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            className="block max-w-full truncate text-left text-[14px] font-semibold text-[var(--flow-ink)]"
            onClick={() => onEdit(task)}
            type="button"
          >
            {task.title}
          </button>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--flow-muted)]">
              {task.description}
            </p>
          )}
        </div>
        <GripVertical className="h-4 w-4 shrink-0 text-[var(--flow-soft)]" />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <span
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-semibold",
            priorityStyles[task.priority]
          )}
        >
          {task.priority}
        </span>
        {task.dueDate && (
          <span className="rounded-md bg-[var(--flow-panel)] px-2 py-1 text-[11px] font-semibold text-[var(--flow-muted)]">
            {task.dueDate}
          </span>
        )}
      </div>

      {task.labels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              className="flex max-w-full items-center gap-1.5 rounded-md bg-[var(--flow-panel)] px-2 py-1 text-[11px] font-semibold"
              key={label.name}
              style={{ color: label.color }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span className="truncate">{label.name}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-[var(--flow-border)] pt-2">
        <div className="flex items-center gap-1.5 text-[var(--flow-muted)]">
          {task.syncCalendar && (
            <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-50 text-emerald-600" title="Synced with Calendar">
              <CalendarDays className="h-3.5 w-3.5" />
            </span>
          )}
          {task.linkNotes && (
            <span className="grid h-7 w-7 place-items-center rounded-md bg-amber-50 text-amber-600" title="Linked with Notes">
              <FileText className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <button
            className="grid h-7 w-7 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-[var(--flow-panel)] hover:text-[var(--flow-ink)]"
            onClick={() => onEdit(task)}
            title="Edit task"
            type="button"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <button
            className="grid h-7 w-7 place-items-center rounded-md text-[var(--flow-muted)] transition hover:bg-coral-50 hover:text-coral-700"
            onClick={() => onDelete(task)}
            title="Delete task"
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function DialogHeader({
  icon,
  onClose,
  subtitle,
  title,
}: {
  icon: ReactNode;
  onClose: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--flow-panel)]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[18px] font-semibold text-[var(--flow-ink)]">{title}</h2>
          <p className="text-[13px] text-[var(--flow-muted)]">{subtitle}</p>
        </div>
      </div>
      <button
        aria-label="Close dialog"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--flow-panel)] text-[var(--flow-muted)]"
        onClick={onClose}
        type="button"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function DialogActions({
  isSaving,
  onCancel,
  submitLabel,
}: {
  isSaving: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        className="h-10 rounded-lg border border-[var(--flow-border)] bg-white px-4 text-[13px] font-semibold text-[var(--flow-muted)] transition hover:text-[var(--flow-ink)]"
        disabled={isSaving}
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>
      <button
        className="h-10 rounded-lg bg-[var(--flow-ink)] px-4 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(47,61,84,0.16)] disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

function ToggleRow({
  checked,
  icon,
  label,
  onChange,
}: {
  checked: boolean;
  icon: ReactNode;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      className={cn(
        "flex h-12 items-center justify-between gap-3 rounded-lg border px-3 text-left transition",
        checked
          ? "border-[var(--flow-mint)] bg-mint-50"
          : "border-[var(--flow-border)] bg-white"
      )}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-[var(--flow-ink)]">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition",
          checked ? "bg-[var(--flow-mint)]" : "bg-[var(--flow-border)]"
        )}
      >
        <span
          className={cn(
            "h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked && "translate-x-4"
          )}
        />
      </span>
    </button>
  );
}
