"use client";
import "@excalidraw/excalidraw/index.css";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
/* exportToBlob must be dynamically imported to avoid SSR window errors */
import { Image, Loader2, Sparkles, StickyNote, Save } from "lucide-react";
/* Excalidraw's internal types cannot be imported externally.
   We safely use 'any' for these types. */
type ExcalidrawImperativeAPI = any;
type ExcalidrawInitialDataState = any;
type SceneData = any;

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

export default function WhiteboardCanvas({
  whiteboardId,
}: {
  whiteboardId: number | null;
}) {
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(
    null
  );
  const [saving, setSaving] = useState(false);
const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiType, setAiType] = useState("Flowchart");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");



async function downloadPng() {
  if (!api) return;
  const { exportToBlob } = await import("@excalidraw/excalidraw");
  const blob = await exportToBlob({
    elements: api.getSceneElements().filter((el: any) => !el.id?.startsWith("sticky_")),
    appState: api.getAppState(),
    files: api.getFiles(),
    mimeType: "image/png",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `whiteboard-${whiteboardId || "export"}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

  async function loadWhiteboard() {
    if (whiteboardId === null) {
      setInitialData(null);
      return;
    }

    const res = await fetch(`/api/whiteboards/${whiteboardId}`);
    const data = await res.json();

    if (!res.ok || !data || typeof data !== "object") {
      setInitialData({
        elements: [],
        appState: { collaborators: [] },
        files: {},
      });
      return;
    }

    const rawScene = data.data || {};

    // Sanitize elements
    const safeElements = Array.isArray(rawScene.elements)
      ? rawScene.elements.filter((el: any) =>
          Number.isFinite(el.x) &&
          Number.isFinite(el.y) &&
          Number.isFinite(el.width ?? 1) &&
          Number.isFinite(el.height ?? 1)
        )
      : [];

    // Sanitize appState with strong defaults
    const rawAppState = rawScene.appState && typeof rawScene.appState === "object"
      ? rawScene.appState
      : {};

    const safeAppState = {
      ...rawAppState,
      zoom: Number.isFinite(rawAppState.zoom) ? rawAppState.zoom : 1,
      scrollX: Number.isFinite(rawAppState.scrollX) ? rawAppState.scrollX : 0,
      scrollY: Number.isFinite(rawAppState.scrollY) ? rawAppState.scrollY : 0,
      width: Number.isFinite(rawAppState.width) ? rawAppState.width : 1200,
      height: Number.isFinite(rawAppState.height) ? rawAppState.height : 800,
      collaborators: Array.isArray(rawAppState.collaborators)
        ? rawAppState.collaborators
        : []
    };

    const scene: SceneData = {
      elements: safeElements,
      appState: safeAppState,
      files:
        rawScene.files && typeof rawScene.files === "object"
          ? rawScene.files
          : {}
    };

    setInitialData(scene);
  }

  async function handleSceneUpdate(
    elements: any,
    appState: any,
    files: any
  ) {
    if (whiteboardId === null) return;

    setSaving(true);

    const scene = {
      elements,
      appState,
      files,
    };

    await fetch(`/api/whiteboards/${whiteboardId}`, {
      method: "PATCH",
      body: JSON.stringify({ data: scene }),
    });

    setSaving(false);
  }

  useEffect(() => {
    loadWhiteboard();
  }, [whiteboardId]);

  return (
    <div className="relative h-full w-full bg-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-12 border-b bg-gray-100 flex items-center justify-between px-4 z-10">
        <p className="text-sm text-gray-600">
          {whiteboardId ? `Whiteboard #${whiteboardId}` : "No whiteboard selected"}
        </p>

<div className="flex items-center gap-3">

<button
    onClick={downloadPng}
    className="px-3 py-1 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center gap-1 text-sm"
    title="Export PNG"
  >
    <Image size={16} />
    PNG
  </button>

<button
    onClick={() => {
      setShowAIDialog(true);
    }}
    className="px-3 py-1 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 text-sm"
    title="AI Diagram Generator"
  >
    <Sparkles size={16} />
    AI
  </button>

  <button
    onClick={() => {
      if (!api) return;
      const appState = api.getAppState();
      const centerX = appState.width / 2 + appState.scrollX;
      const centerY = appState.height / 2 + appState.scrollY;

      const note = {
        id: `sticky_${Date.now()}`,
        type: "text",
        x: centerX,
        y: centerY,
        text: "Sticky Note",
        width: 200,
        height: 100,
        fontSize: 20,
        backgroundColor: "yellow",
        strokeColor: "black",
      };

      api.updateScene({ elements: [...api.getSceneElements(), note] });
    }}
    className="px-3 py-1 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white flex items-center gap-1 text-sm"
    title="Add Sticky Note"
  >
    <StickyNote size={16} />
    Note
  </button>

  <button
    onClick={async () => {
      if (!api || whiteboardId === null) return;
      setSaving(true);

      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();

      await fetch(`/api/whiteboards/${whiteboardId}`, {
        method: "PATCH",
        body: JSON.stringify({
          data: { elements, appState, files }
        }),
      });

      setSaving(false);
    }}
    className={`px-3 py-1 rounded-full bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-1 text-sm ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
    disabled={saving}
    title="Save Diagram"
  >
    <Save size={16} />
    Save Diagram
  </button>

  {saving && (
    <Loader2 size={18} className="animate-spin text-gray-600" />
  )}

        </div>
      </div>

<div className="absolute top-12 left-0 right-0 bottom-0 transform-gpu will-change-transform">
        {!whiteboardId ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a whiteboard to begin.
          </div>
        ) : initialData === null ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <Excalidraw
            initialData={
              initialData || {
                elements: [],
                appState: { collaborators: [] },
                files: {},
              }
            }
            excalidrawAPI={(api: ExcalidrawImperativeAPI) => setApi(api)}
          />
        )}
{showAIDialog && (
  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded shadow-lg w-[420px]">

      <h2 className="font-semibold text-lg mb-2">AI Diagram Generator</h2>

      {aiError && (
        <p className="text-red-500 text-sm mb-3">{aiError}</p>
      )}

      <label className="text-sm font-medium">Describe your diagram</label>
      <textarea
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        className="w-full h-24 border rounded p-2 text-sm mb-3"
        placeholder="e.g. A flowchart showing onboarding steps"
      />

      <label className="text-sm font-medium">Diagram Type</label>
      <select
        value={aiType}
        onChange={(e) => setAiType(e.target.value)}
        className="w-full border rounded p-2 text-sm mb-4"
      >
        <option>Flowchart</option>
        <option>Mind Map</option>
        <option>System Architecture</option>
        <option>User Journey</option>
        <option>Process</option>
      </select>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowAIDialog(false)}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          disabled={aiLoading}
        >
          Cancel
        </button>

        <button
          onClick={async () => {
            try {
              setAiLoading(true);
              setAiError("");

console.log("AI GENERATE: starting request…");
const res = await fetch("/api/ai-diagram", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: aiPrompt,
                  diagramType: aiType,
                }),
              });

console.log("AI GENERATE: got response object", res);
const data = await res.json();
console.log("AI GENERATE: parsed JSON", data);
if (!res.ok) {
  console.log("AI GENERATE: response not ok", data);
                setAiError(data.error || "Failed to generate diagram.");
                setAiLoading(false);
                return;
              }

if (!Array.isArray(data.elements)) {
  console.log("AI GENERATE: elements invalid", data);
                setAiError("Invalid diagram format returned by AI.");
                setAiLoading(false);
                return;
              }

if (api) {
  console.log("AI GENERATE: updating scene with elements", data.elements);
  const existing = api.getSceneElements();

  // FILTER OUT STICKY NOTES BEFORE MERGING
  const filtered = existing.filter((el: any) => !el.id?.startsWith("sticky_"));

  console.log("EXISTING ELEMENTS BEFORE AI ADD (STICKY NOTES REMOVED):", filtered);

  api.updateScene({
    elements: [...filtered, ...data.elements],
    appState: api.getAppState(),
    files: api.getFiles(),
  });

  api.scrollToContent(data.elements, {
    fitToContent: true,
    padding: 50,
  });
}

              // Auto-close dialog
              setShowAIDialog(false);
              setAiPrompt("");
              setAiLoading(false);
} catch (err) {
  console.error("AI GENERATE: caught exception", err);
  setAiError("Unexpected error");
  setAiLoading(false);
}
          }}
          className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          disabled={aiLoading}
        >
          {aiLoading && <Loader2 className="animate-spin" size={16} />}
          Generate
        </button>
      </div>
    </div>
  </div>
)}

</div>
    </div>
  );
}
