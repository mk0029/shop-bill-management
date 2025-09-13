"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, UserCog, ListChecks, PackageSearch } from "lucide-react";

export default function AdminShortcutsSection() {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Settings className="h-5 w-5" /> Quick Shortcuts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-300">
        <p>Jump to frequently used admin pages.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link href="/admin/manage-admins" className="inline-flex">
            <Button className="w-full bg-gray-800 text-gray-200 hover:bg-gray-700 justify-start gap-2">
              <UserCog className="h-4 w-4" /> Manage Admins
            </Button>
          </Link>
          <Link href="/admin/specifications" className="inline-flex">
            <Button className="w-full bg-gray-800 text-gray-200 hover:bg-gray-700 justify-start gap-2">
              <ListChecks className="h-4 w-4" /> Specifications
            </Button>
          </Link>
          <Link href="/admin/inventory" className="inline-flex">
            <Button className="w-full bg-gray-800 text-gray-200 hover:bg-gray-700 justify-start gap-2">
              <PackageSearch className="h-4 w-4" /> Inventory
            </Button>
          </Link>
          <Link href="/admin/billing" className="inline-flex">
            <Button className="w-full bg-gray-800 text-gray-200 hover:bg-gray-700 justify-start gap-2">
              {/* Reuse Settings icon */}
              <Settings className="h-4 w-4" /> Billing
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
