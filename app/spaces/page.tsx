"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Space } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@/components/ui/dropdown";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SpaceCard } from "@/components/ui/space-card";
import { Button } from "@/components/ui/button";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter } from "@/components/ui/modal";
import { Plus, FileText, ChevronDown } from "lucide-react";

type ExtendedSpace = Space & { pageCount?: number };

export default function SpacesPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<ExtendedSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewSpaceModal, setShowNewSpaceModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceDescription, setNewSpaceDescription] = useState("");
  const [newSpaceColor, setNewSpaceColor] = useState("#6d28d9");

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (filter !== "all") params.append("filter", filter);
        if (sort) params.append("sort", sort);
        if (searchQuery) params.append("search", searchQuery);
        
        const res = await fetch(`/api/spaces?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSpaces(data);
        }
      } catch (err) {
        console.error("Failed to load spaces:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter, sort, searchQuery]);

  const sortedSpaces = [...spaces].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "pages") return (b.pageCount || 0) - (a.pageCount || 0);
    if (sort === "favorites") {
      if (a.isFavorite === b.isFavorite) return 0;
      return a.isFavorite ? -1 : 1;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const handleFavorite = async (space: ExtendedSpace) => {
    await fetch(`/api/spaces/${space.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !space.isFavorite }),
    });
    setSpaces(spaces.map(s => s.id === space.id ? { ...s, isFavorite: !s.isFavorite } : s));
  };

  const handleMenuAction = (space: ExtendedSpace, action: string) => {
    if (action === "create-page") {
      // Navigate to space detail view where user can create a page
      router.push(`/spaces/${space.id}`);
      return;
    }
    
    // Handle other async actions separately
    if (action === "archive") {
      fetch(`/api/spaces/${space.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      }).then(() => {
        setSpaces(spaces.filter(s => s.id !== space.id));
      }).catch(err => console.error("Failed to archive space:", err));
    } else if (action === "delete") {
      if (confirm("Delete this space?")) {
        fetch(`/api/spaces/${space.id}`, { method: "DELETE" })
          .then(() => setSpaces(spaces.filter(s => s.id !== space.id)))
          .catch(err => console.error("Failed to delete space:", err));
      }
    }
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSpaceName,
          description: newSpaceDescription,
          color: newSpaceColor,
        }),
      });
      if (res.ok) {
        const newSpace = await res.json();
        setSpaces([...spaces, newSpace]);
        setShowNewSpaceModal(false);
        setNewSpaceName("");
        setNewSpaceDescription("");
        setNewSpaceColor("#6d28d9");
        // Stay in same panel: use search param instead of dynamic route
        router.push(`/spaces?spaceId=${newSpace.id}`);
      }
    } catch (err) {
      console.error("Failed to create space:", err);
    }
  };

  const renderSpacesList = (spaceList: ExtendedSpace[]) => {
    if (view === "grid") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {spaceList.map((space) => (
            <SpaceCard
              key={space.id}
              id={space.id}
              name={space.name}
              description={space.description || ""}
              color={space.color}
              members={[]}
              pageCount={space.pageCount || 0}
              updatedAt={formatTimeAgo(space.updatedAt)}
              favorited={space.isFavorite || false}
              onOpen={() => router.push(`/spaces?spaceId=${space.id}`)}
              onFavorite={() => handleFavorite(space)}
              onMenuAction={(action) => handleMenuAction(space, action)}
            />
          ))}
        </div>
      );
    }
    return (
      <div className="mt-6 space-y-3">
        {spaceList.map((space) => (
          <div
            key={space.id}
            onClick={() => router.push(`/spaces?spaceId=${space.id}`)}
            className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded flex items-center justify-center text-white text-xs" style={{ backgroundColor: space.color }}>
                📁
              </div>
              <div>
                <p className="font-medium">{space.name}</p>
                <p className="text-xs text-gray-500">{space.description || "No description"}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {space.pageCount || 0} pages • {formatTimeAgo(space.updatedAt)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTabContent = (tabFilter: string) => {
    let filtered = sortedSpaces;
    if (tabFilter === "favorites") filtered = sortedSpaces.filter(s => s.isFavorite);
    if (tabFilter === "archived") filtered = sortedSpaces.filter(s => s.isArchived);
    
    if (loading) return <p className="mt-6">Loading...</p>;
    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center text-[var(--flow-muted)] mt-6">
          <div className="text-5xl mb-4">📁</div>
          <p className="font-medium">No spaces found</p>
          <p className="text-sm mt-1">Create a space or adjust the filters.</p>
        </div>
      );
    }
    return renderSpacesList(filtered);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Top Header */}
      <div className="space-y-2">
        <Breadcrumb items={[{ label: "Pages & Spaces" }]} />
        <h1 className="text-3xl font-bold text-[var(--flow-ink)]">
          Organize every working document by space.
        </h1>
      </div>

      {/* Toolbar Row */}
      <div className="flex items-center justify-between">
        <div className="w-72">
          <Input 
            placeholder="Search spaces or pages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <ViewToggle value={view} onChange={setView} />

          <Dropdown>
            <DropdownTrigger>
              <div className="flex items-center gap-1 text-sm text-[var(--flow-muted)] hover:text-[var(--flow-ink)]">
                Sort
                <ChevronDown className="h-4 w-4" />
              </div>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem onClick={() => setSort("recent")}>Recently Updated</DropdownItem>
              <DropdownItem onClick={() => setSort("name")}>Name</DropdownItem>
              <DropdownItem onClick={() => setSort("pages")}>Most Pages</DropdownItem>
              <DropdownItem onClick={() => setSort("favorites")}>Favorites</DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <Button className="flex items-center gap-2" onClick={() => setShowNewSpaceModal(true)}>
            <Plus className="h-4 w-4" /> New Space
          </Button>

          <Button 
            variant="secondary" 
            className="flex items-center gap-2"
            onClick={() => {
              // Prompt user to create or select a space first
              if (spaces.length === 0) {
                setShowNewSpaceModal(true);
              } else {
                // Navigate to first space using search param to stay in same panel
                router.push(`/spaces?spaceId=${spaces[0].id}`);
              }
            }}
          >
            <FileText className="h-4 w-4" /> New Page
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All Spaces</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="recent">Recently Opened</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="all">{renderTabContent("all")}</TabsContent>
        <TabsContent value="favorites">{renderTabContent("favorites")}</TabsContent>
        <TabsContent value="recent">{renderTabContent("recent")}</TabsContent>
        <TabsContent value="archived">{renderTabContent("archived")}</TabsContent>
      </Tabs>

      {/* Create Space Modal */}
      <Modal open={showNewSpaceModal} onOpenChange={setShowNewSpaceModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader title="Create New Space" description="Organize your work with a new space." />
          <div className="space-y-4 p-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Space name</label>
              <Input 
                placeholder="e.g., Work Projects" 
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Description</label>
              <Input 
                placeholder="Brief description of this space" 
                value={newSpaceDescription}
                onChange={(e) => setNewSpaceDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2">
                {["#6d28d9", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewSpaceColor(color)}
                    className={`h-8 w-8 rounded-full border-2 transition ${newSpaceColor === color ? "border-gray-900" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowNewSpaceModal(false)}>Cancel</Button>
            <Button onClick={handleCreateSpace} disabled={!newSpaceName.trim()}>
              Create Space
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString();
}