"use client";

import { useEffect, useState } from "react";
import { Page, Space } from "@/db/schema";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PagePreview() {
  const params = useParams();
  const spaceId = params.id;
  const pageId = params.pageId;

  const [page, setPage] = useState<Page | null>(null);
  const [space, setSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const resSpaces = await fetch(`/api/spaces`);
      const allSpaces = await resSpaces.json();
      const foundSpace = allSpaces.find((s: Space) => s.id === Number(spaceId));
      setSpace(foundSpace || null);

      const resPages = await fetch(`/api/pages?spaceId=${spaceId}`);
      const allPages = await resPages.json();
      const foundPage = allPages.find((p: Page) => p.id === Number(pageId));
      setPage(foundPage || null);

      setLoading(false);
    }
    load();
  }, [spaceId, pageId]);

  if (!page || !space) {
    return (
      <div className="p-6">
        <p>Page not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/spaces" className="hover:underline">
          All Spaces
        </Link>{" "}
        >{" "}
        <Link href={`/spaces/${spaceId}`} className="hover:underline">
          {space.name}
        </Link>{" "}
        > <span>{page.name}</span>
      </nav>

      <div className="border rounded-xl p-6 shadow-sm bg-white">
        <h1 className="text-2xl font-semibold">{page.name}</h1>

        <div className="mt-2 text-sm text-gray-500">
          <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 mr-2">
            {page.template}
          </span>
          In <strong>{space.name}</strong>
        </div>

        {page.description && (
          <p className="mt-4 text-gray-700">{page.description}</p>
        )}

        <div className="mt-6 border-t pt-4 text-sm text-gray-500">
          <p>Last updated: {new Date(page.updatedAt).toLocaleString()}</p>
          {page.updatedBy && <p>Updated by: {page.updatedBy}</p>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Actions</h2>
        <div className="flex gap-3 flex-wrap">
          <button className="px-3 py-1 border rounded">Rename</button>
          <button className="px-3 py-1 border rounded">Move</button>
          <button className="px-3 py-1 border rounded">Duplicate</button>
          <button className="px-3 py-1 border rounded">Favorite</button>
          <button className="px-3 py-1 border rounded">Share</button>
          <button className="px-3 py-1 border rounded">Export</button>
          <button className="px-3 py-1 border rounded text-red-500">
            Archive
          </button>
          <button className="px-3 py-1 border rounded text-red-600">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}