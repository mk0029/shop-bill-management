"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Trash2 } from "lucide-react";

interface HeaderSectionProps {
  onPrint: () => void;
  onClearAll: () => void;
}

export default function HeaderSection({
  onPrint,
  onClearAll,
}: HeaderSectionProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
        Fitting Items List
      </h1>
      <div className="flex gap-2">
        {/* <Button
          variant="outline"
          className="border-gray-700 text-gray-200"
          onClick={onPrint}
        >
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button> */}
        <Button
          variant="outline"
          className="border-gray-700 text-gray-200"
          onClick={onClearAll}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Clear
        </Button>
      </div>
    </div>
  );
}
