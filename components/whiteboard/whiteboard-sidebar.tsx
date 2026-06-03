"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, CircleDot } from "lucide-react";

type Whiteboard = {
  id: number;
  name: string;
  color: string;
  updatedAt: string;
};

export default function WhiteboardSidebar({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [boards, setBoards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch whiteboards
  async function loadBoards() {
    setLoading(true);
    const res = await fetch("/api/whiteboards");
    const data = await res.json();

    if (!res.ok || !Array.isArray(data)) {
      setBoards([]);
      setLoading(false);
      return;
    }

    setBoards(data);
    setLoading(false);
  }

  // Create new whiteboard
  async function createBoard() {
    const res = await fetch("/api/whiteboards", {
      method: "POST",
      body: JSON.stringify({ name: "New Whiteboard" }),
    });
    await loadBoards();
  }

  // Delete whiteboard
  async function deleteBoard(id: number) {
    await fetch(`/api/whiteboards/${id}`, { method: "DELETE" });
    if (selectedId === id) onSelect(null);
    await loadBoards();
  }

  // Rename whiteboard
  async function renameBoard(id: number) {
    const name = prompt("Rename whiteboard:");
    if (!name) return;

    await fetch(`/api/whiteboards/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    await loadBoards();
  }

  useEffect(() => {
    loadBoards();
  }, []);

  return (
    <div className="w-64 h-full border-r bg-gray-50 flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold">Whiteboards</h2>
        <button
          onClick={createBoard}
          className="p-1 rounded hover:bg-gray-200"
          title="New Whiteboard"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-sm text-gray-500">Loading…</p>}

        {boards.map((board) => (
          <div
            key={board.id}
            className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-200 ${
              selectedId === board.id ? "bg-gray-200" : ""
            }`}
            onClick={() => onSelect(board.id)}
          >
            <div className="flex items-center gap-2">
              <CircleDot size={14} color={board.color} />
              <div>
                <p className="font-medium text-sm">{board.name}</p>
                <p className="text-xs text-gray-500">
{new Date(board.updatedAt).toISOString().slice(0, 10)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  renameBoard(board.id);
                }}
                className="hover:text-blue-500"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBoard(board.id);
                }}
                className="hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}