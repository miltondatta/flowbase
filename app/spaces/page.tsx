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
import { Button } from "@/components/ui/button"; // already exists
import { Plus, FileText, ChevronDown } from "lucide-react";

export default function SpacesPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/spaces");
      const data = await res.json();
      setSpaces(data);
      setLoading(false);
    }
    load();
  }, []);

  const sortedSpaces = [...spaces].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    return 0; // TODO: expand later
  });

  return (
    <div className="p-8 space-y-8">

      {/* Top Header */}
      <div className="space-y-2">
        <Breadcrumb
          items={[{ label: "Pages & Spaces" }]}
        />

        <h1 className="text-3xl font-bold text-[var(--flow-ink)]">
          Organize every working document by space.
        </h1>
      </div>

      {/* Toolbar Row */}
      <div className="flex items-center justify-between">

        {/* Search */}
        <div className="w-72">
          <Input placeholder="Search spaces or pages..." />
        </div>

        <div className="flex items-center gap-3">

          {/* Grid/List Toggle */}
          <ViewToggle value={view} onChange={setView} />

          {/* Sort Dropdown */}
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

          {/* New Buttons */}
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Space
          </Button>

          <Button variant="secondary" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> New Page
          </Button>

        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Spaces</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="recent">Recently Opened</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loading ? (
            <p>Loading...</p>
          ) : sortedSpaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-[var(--flow-muted)]">
              <div className="text-5xl mb-4">📁</div>
              <p className="font-medium">No spaces found</p>
              <p className="text-sm mt-1">Create a space or adjust the filters.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
              {sortedSpaces.map((space) => (
                <SpaceCard
                  key={space.id}
                  id={space.id}
                  name={space.name}
                  description={space.description || ""}
                  members={[]} 
                  pageCount={0}
                  updatedAt={"just now"}
                  favorited={false}
onOpen={() => router.push(`/spaces/${space.id}`)}
                  onFavorite={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {sortedSpaces.map((space) => (
                <div
                  key={space.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  List view coming soon
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}