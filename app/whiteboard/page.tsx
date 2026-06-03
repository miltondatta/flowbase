"use client";

import { useEffect, useState } from "react";
import WhiteboardSidebar from "@/components/whiteboard/whiteboard-sidebar";
import WhiteboardCanvas from "@/components/whiteboard/whiteboard-canvas";

export default function WhiteboardPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="flex h-screen overflow-hidden">
      <WhiteboardSidebar
        selectedId={selectedId}
onSelect={(id) => {
  console.log("SELECTED", id);
  setSelectedId(id);
}}
      />

      <div className="flex-1 h-full">
        <WhiteboardCanvas whiteboardId={selectedId} />
      </div>
    </div>
  );
}