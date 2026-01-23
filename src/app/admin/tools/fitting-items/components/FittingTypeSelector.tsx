"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FittingType, TYPE_LABELS } from "../types";

interface FittingTypeSelectorProps {
  fitType: FittingType;
  onFitTypeChange: (type: FittingType) => void;
}

export default function FittingTypeSelector({
  fitType,
  onFitTypeChange,
}: FittingTypeSelectorProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Fitting Type</CardTitle>
      </CardHeader>
      <CardContent className="text-gray-300">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as FittingType[]).map((t) => (
            <button
              key={t}
              onClick={() => onFitTypeChange(t)}
              className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                fitType === t
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
