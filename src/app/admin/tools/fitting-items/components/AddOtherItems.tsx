"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Plus } from "lucide-react";
import { UNIT_OPTIONS } from "../types";

interface AddOtherItemsProps {
  itemName: string;
  qty: any;
  unit: string;
  onItemNameChange: (value: string) => void;
  onQtyChange: (value: any) => void;
  onUnitChange: (value: string) => void;
  onAddClick: () => void;
}

export default function AddOtherItems({
  itemName,
  qty,
  unit,
  onItemNameChange,
  onQtyChange,
  onUnitChange,
  onAddClick,
}: AddOtherItemsProps) {
  return (
    <Card>
      <CardContent className="space-y-4 text-gray-300">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <Label className="text-gray-200">Item name</Label>
            <Input
              value={itemName}
              onChange={(e) => onItemNameChange(e.target.value)}
              placeholder="e.g. 6A Socket"
              className="bg-gray-800 border-gray-700 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-200">Quantity</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="number"
                inputMode="numeric"
                value={Number.isFinite(qty) ? qty : ""}
                onChange={(e) =>
                  onQtyChange(
                    Math.max(0, Math.floor(Number(e.target.value || ""))),
                  )
                }
                className="bg-gray-800 border-gray-700 text-white w-28"
              />
              <Dropdown
                options={UNIT_OPTIONS}
                removeSearchForce
                value={unit}
                onValueChange={onUnitChange}
                placeholder="Unit"
                className="min-w-[80px]"
              />
            </div>
          </div>
          <div className="flex">
            <Button
              className="bg-blue-600 hover:bg-blue-500 w-full"
              onClick={onAddClick}
            >
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
