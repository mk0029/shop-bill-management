"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";

interface ErrorBoundaryProps {
  error?: string | Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
  showRetry?: boolean;
  className?: string;
}

export function ErrorBoundary({
  error,
  onRetry,
  title = "Something went wrong",
  description = "An error occurred while loading this content.",
  showRetry = true,
  className = "",
}: ErrorBoundaryProps) {
  if (!error) return null;

  const errorMessage = typeof error === "string" ? error : error.message;

  return (
    <Card className={`p-6 border-red-200 bg-red-50 ${className}`}>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-red-900">{title}</h3>
          <p className="text-sm text-red-700">{description}</p>
          {errorMessage && (
            <p className="text-xs text-red-600 font-mono bg-red-100 p-2 rounded">
              {errorMessage}
            </p>
          )}
        </div>

        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </Card>
  );
}
