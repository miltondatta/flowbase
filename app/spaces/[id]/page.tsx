"use client";

import { useEffect, useState } from "react";
import { Page, Space } from "@/db/schema";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@/components/ui/dropdown";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Plus, MoreHorizontal, ChevronDown } from "lucide-react";
import {
  Modal,
  ModalTrigger,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
} from "@/components/ui/modal";

export default function SpacePages() {
  const params = useParams();
  const spaceId = params.id;

  const [space, setSpace] = useState<Space | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  const [openNewPageModal, setOpenNewPageModal] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageTemplate, setNewPageTemplate] = useState("blank");

  useEffect(() => {
    async function load() {
      const resSpace = await fetch(`/api/spaces`);
      const allSpaces = await resSpace.json();
      const found = allSpaces.find((s: Space) => s.id === Number(spaceId));
      setSpace(found || null);

      const resPages = await fetch(`/api/pages?spaceId=${spaceId}`);
      const dataPages = await resPages.json();
      setPages(dataPages);
      setLoading(false);
    }
    load();
  }, [spaceId]);

  if (!space) {
    return (
      <div className="p-6">
        <p>Space not found.</p>
    </div>

    );
  }

  async function handleCreatePage() {
    if (!newPageName.trim()) return;

    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newPageName,
        template: newPageTemplate,
        spaceId,
      }),
    });

    const page = await res.json();

    setOpenNewPageModal(false);
    setNewPageName("");

    window.location.href = `/spaces/${spaceId}/pages/${page.id}`;
  }

  return (
    <div className="p-6">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/spaces" className="hover:underline">
          All Spaces
        </Link>{" "}
          <span className="mx-1">{">"}</span>
          <span>{space.name}</span>
      </nav>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {space.name}{" "}
          <span className="text-gray-500 text-sm">({pages.length} pages)</span>
        </h1>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpenNewPageModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Page
          </Button>

          <Dropdown>
            <DropdownTrigger className="px-2 py-1.5">
              <MoreHorizontal className="h-5 w-5" />
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem>Edit Space</DropdownItem>
              <DropdownItem>Favorite</DropdownItem>
              <DropdownItem danger>Delete Space</DropdownItem>
            </DropdownMenu>
          </Dropdown>
    <Modal open={openNewPageModal} onOpenChange={setOpenNewPageModal}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader
          title="Create Page"
          description="Create a new page inside this space."
        />

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Page name</label>
            <input
              type="text"
              placeholder="Enter page name"
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-700">Template</label>
            <select
              value={newPageTemplate}
              onChange={(e) => setNewPageTemplate(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="blank">Blank</option>
              <option value="notes">Notes</option>
              <option value="task-list">Task List</option>
            </select>
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setOpenNewPageModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreatePage}>Create</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : pages.length === 0 ? (
        <p>No pages yet.</p>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/spaces/${spaceId}/pages/${page.id}`}
              className="border p-4 rounded-lg hover:bg-gray-50 block"
            >
              <div className="font-medium">{page.name}</div>
              <div className="text-xs text-gray-500 mt-1">{page.template}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}