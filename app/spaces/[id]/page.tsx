"use client";

import { useEffect, useState } from "react";
import { Page, Space } from "@/db/schema";
import { useParams, useRouter } from "next/navigation";
import { Plus, MoreHorizontal, FileText, CircleDot, Search, Grid3x3, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
} from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

type ExtendedPage = Page & {
  updatedByName?: string;
};

export default function SpacePages() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [pages, setPages] = useState<ExtendedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [openNewPageModal, setOpenNewPageModal] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageSpaceId, setNewPageSpaceId] = useState<string>("");
  const [newPageTemplate, setNewPageTemplate] = useState("blank");
  const [newPageDescription, setNewPageDescription] = useState("");

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const resSpaces = await fetch(`/api/spaces`);
        if (!resSpaces.ok) {
          if (resSpaces.status === 401) router.push('/sign-in');
          return;
        }
        const allSpaces = await resSpaces.json();
        setSpaces(allSpaces);

        const resPages = await fetch(`/api/pages?spaceId=${spaceId}`);
        if (!resPages.ok) {
          if (resPages.status === 401) router.push('/sign-in');
          return;
        }
        setPages(await resPages.json());
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [spaceId]);

  async function handleCreatePage() {
    if (!newPageName.trim()) return;
    const targetSpaceId = newPageSpaceId || spaceId;

    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newPageName,
        description: newPageDescription,
        template: newPageTemplate,
        spaceId: targetSpaceId,
      }),
    });

    if (res.ok) {
      const page = await res.json();
      setOpenNewPageModal(false);
      setNewPageName("");
      setNewPageDescription("");
      setNewPageTemplate("blank");
      setNewPageSpaceId("");
      
      if (targetSpaceId === spaceId) {
        setPages([...pages, page]);
      }
    }
  }

  async function handlePageRename(page: ExtendedPage) {
    const newName = prompt("Rename page:", page.name);
    if (newName && newName.trim()) {
      await fetch(`/api/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      setPages(pages.map(p => p.id === page.id ? { ...p, name: newName } : p));
    }
  }

  async function handlePageDelete(page: ExtendedPage) {
    if (confirm("Delete this page?")) {
      await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
      setPages(pages.filter(p => p.id !== page.id));
    }
  }

  async function handleSpaceRename(space: Space) {
    const newName = prompt("Rename space:", space.name);
    if (newName && newName.trim()) {
      await fetch(`/api/spaces/${space.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      setSpaces(spaces.map(s => s.id === space.id ? { ...s, name: newName } : s));
    }
  }

  async function handleSpaceDelete(space: Space) {
    if (confirm("Delete this space?")) {
      await fetch(`/api/spaces/${space.id}`, { method: "DELETE" });
      router.push("/spaces");
    }
  }

  const currentSpace = spaces.find(s => s.id === Number(spaceId));
  
  const filteredPages = pages
    .filter(p => !p.isArchived)
    .filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const templateLabels: Record<string, string> = {
    blank: "Blank",
    "project-plan": "Project Plan",
    "meeting-notes": "Meeting Notes",
    prd: "PRD",
    "research-notes": "Research Notes",
    "task-plan": "Task Plan",
  };

  const templateColors: Record<string, string> = {
    blank: "bg-gray-100 text-gray-700",
    "project-plan": "bg-blue-100 text-blue-700",
    "meeting-notes": "bg-green-100 text-green-700",
    prd: "bg-purple-100 text-purple-700",
    "research-notes": "bg-yellow-100 text-yellow-700",
    "task-plan": "bg-red-100 text-red-700",
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Left Sidebar: Spaces List */}
      <div className="w-64 h-full border-r bg-gray-50/50 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-900">Spaces</h2>
            <button
              onClick={() => router.push("/spaces")}
              className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              title="Manage Spaces"
            >
              <Plus size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <p className="p-3 text-xs text-gray-500">Loading…</p>
          ) : (
            spaces.map((space) => (
              <div
                key={space.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${
                  space.id === Number(spaceId) 
                    ? "bg-gray-200" 
                    : "hover:bg-gray-100"
                }`}
                onClick={() => router.push(`/spaces/${space.id}`)}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CircleDot 
                    size={14} 
                    color={space.color} 
                    className="flex-shrink-0" 
                  />
                  <span className="text-sm font-medium truncate flex-1">
                    {space.name}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpaceRename(space);
                    }}
                    className="p-1 hover:bg-gray-300 rounded"
                    title="Rename"
                  >
                    <FileText size={12} className="text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpaceDelete(space);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                    title="Delete"
                  >
                    <Plus size={12} className="text-red-600 rotate-45" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentSpace && (
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: currentSpace.color }}
                >
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentSpace?.name || "Space"}
                </h1>
                <p className="text-xs text-gray-500">
                  {filteredPages.length} {filteredPages.length === 1 ? 'page' : 'pages'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => {
                  setNewPageSpaceId(spaceId);
                  setOpenNewPageModal(true);
                }}
                className="bg-gray-900 hover:bg-gray-800 text-white text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                New Page
              </Button>
            </div>
          </div>

          {/* Search and View Toggle */}
          <div className="flex items-center justify-between mt-4">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search pages..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-md">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded ${
                  viewMode === "grid" 
                    ? "bg-white shadow-sm" 
                    : "hover:bg-gray-200"
                }`}
              >
                <Grid3x3 size={16} className="text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded ${
                  viewMode === "list" 
                    ? "bg-white shadow-sm" 
                    : "hover:bg-gray-200"
                }`}
              >
                <List size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Pages Content */}
        <div className="p-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading pages…</p>
          ) : filteredPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                No pages yet
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Create your first page to get started
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setNewPageSpaceId(spaceId);
                  setOpenNewPageModal(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Page
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPages.map((page) => (
                <div
                  key={page.id}
                  className="group relative bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <h3 className="font-medium text-sm text-gray-900 truncate">
                        {page.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePageRename(page);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <FileText size={14} className="text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePageDelete(page);
                        }}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Plus size={14} className="text-red-500 rotate-45" />
                      </button>
                    </div>
                  </div>

                  {page.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {page.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        templateColors[page.template] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {templateLabels[page.template] || page.template}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPages.map((page) => (
                <div
                  key={page.id}
                  className="group flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-gray-900 truncate">
                        {page.name}
                      </h3>
                      {page.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {page.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        templateColors[page.template] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {templateLabels[page.template] || page.template}
                    </Badge>
                    <span className="text-xs text-gray-400 w-24 text-right">
                      {new Date(page.updatedAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePageRename(page);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <FileText size={14} className="text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePageDelete(page);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded"
                      >
                        <Plus size={14} className="text-red-500 rotate-45" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Page Modal */}
      <Modal open={openNewPageModal} onOpenChange={setOpenNewPageModal}>
        <ModalOverlay />
        <ModalContent className="max-w-md">
          <ModalHeader 
            title="Create New Page" 
            description="Add a page to your workspace" 
          />
          <div className="space-y-4 p-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Page name <span className="text-red-500">*</span>
              </label>
              <Input 
                placeholder="e.g., Q2 Roadmap" 
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                className="h-9"
                autoFocus
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Add to Space
              </label>
              <select
                value={newPageSpaceId || spaceId}
                onChange={(e) => setNewPageSpaceId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 h-9"
              >
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Template
              </label>
              <select
                value={newPageTemplate}
                onChange={(e) => setNewPageTemplate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 h-9"
              >
                <option value="blank">Blank Page</option>
                <option value="project-plan">Project Plan</option>
                <option value="meeting-notes">Meeting Notes</option>
                <option value="prd">PRD</option>
                <option value="research-notes">Research Notes</option>
                <option value="task-plan">Task Plan</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Description
              </label>
              <Input 
                placeholder="Brief description (optional)" 
                value={newPageDescription}
                onChange={(e) => setNewPageDescription(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <ModalFooter>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setOpenNewPageModal(false)}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleCreatePage} 
              disabled={!newPageName.trim()}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              Create Page
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}