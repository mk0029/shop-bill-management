"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Package, FolderTree } from "lucide-react";

const SANITY_STUDIO_URL = process.env.NEXT_PUBLIC_SANITY_STUDIO_URL || "";

export default function SanityActionsPage() {
  const studioBase = SANITY_STUDIO_URL.replace(/\/+$/, "");

  const openInSanity = (type: string) => {
    const url = `${studioBase}/structure/${type};create=${type}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Sanity Studio Actions</h1>
        <p className="text-sm text-gray-400 mt-1">
          Quick actions to create content in Sanity Studio
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <Card className="cursor-pointer hover:border-cyan-500/50 transition-all group" onClick={() => openInSanity("shopCategory")}>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-cyan-500/10 p-4 group-hover:bg-cyan-500/20 transition-colors">
              <FolderTree className="h-8 w-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Create Category</h3>
            <p className="text-sm text-gray-400 mb-4">Add a new shop category</p>
            <Button variant="default" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Create Category
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-cyan-500/50 transition-all group" onClick={() => openInSanity("shopProduct")}>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 rounded-full bg-cyan-500/10 p-4 group-hover:bg-cyan-500/20 transition-colors">
              <Package className="h-8 w-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Create Product</h3>
            <p className="text-sm text-gray-400 mb-4">Add a new shop product</p>
            <Button variant="default" size="sm">
              <Plus className="mr-2 h-4 w-4" /> Create Product
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
