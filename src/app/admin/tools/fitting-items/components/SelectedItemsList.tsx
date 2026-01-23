"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Trash2 } from "lucide-react";
import { SelectedItem } from "../types";

interface SelectedItemsListProps {
  items: SelectedItem[];
  onUpdateQty: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onShareClick: () => void;
  shareLine: string;
}

export default function SelectedItemsList({
  items,
  onUpdateQty,
  onRemoveItem,
  onClearAll,
  onShareClick,
  shareLine,
}: SelectedItemsListProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trash2 className="w-5 h-5" /> Selected Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-gray-300">
        {items.length === 0 ? (
          <div className="text-gray-400">No items added yet.</div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-auto">
            {items.map((it) => (
              <div className="flex items-center gap-3 p-2 border border-gray-800 rounded-md bg-gray-950">
                <div className="flex-1 text-white">{it.name}</div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={it.qty}
                    onChange={(e) =>
                      onUpdateQty(it.id, Number(e.target.value || 0))
                    }
                    className="bg-gray-800 border-gray-700 text-white w-16 sm:w-24"
                  />
                  <div className="text-gray-300 text-sm w-12">{it.unit}</div>
                  <Button
                    variant="ghost"
                    className="text-red-300 hover:text-red-200"
                    onClick={() => onRemoveItem(it.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex items-end justify-end">
              <Button
                onClick={onClearAll}
                className="bg-red-600 hover:bg-red-500 mt-3 text-white"
              >
                Erase
              </Button>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-3">
            <Label className="text-gray-200">Share Options</Label>
            <div className="flex w-full gap-2 mt-1">
              <Button
                onClick={onShareClick}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2 max-sm:flex-1"
              >
                <Trash2 className="w-4 h-4" /> Share
              </Button>
              <Button
                onClick={() => navigator.clipboard.writeText(shareLine)}
                variant="outline"
                className="border-gray-700 text-gray-200 flex items-center gap-2 max-sm:flex-1"
              >
                <Trash2 className="w-4 h-4" /> Copy List
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
