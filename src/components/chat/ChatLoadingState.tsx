"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type Props = {
  title?: string;
  subtitle?: string;
};

export function ChatLoadingState({
  title = "Loading chat",
  subtitle = "Fetching conversations and messages…",
}: Props) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header skeleton */}
      <div className="border-b border-gray-800 bg-gray-900/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-700/70" />
          <div className="space-y-1">
            <div className="h-3 w-32 animate-pulse rounded bg-gray-700/70" />
            <div className="h-2 w-48 animate-pulse rounded bg-gray-800" />
          </div>
        </div>
      </div>

      {/* Body skeleton with spinner + bubbles */}
      <div className="relative flex grow flex-col gap-6 px-4 py-6">
        {/* Center spinner */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-gray-800/70 p-3 ring-1 ring-gray-700">
              <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
            </div>
            <div className="text-sm font-medium text-gray-200">{title}…</div>
            <div className="text-xs text-gray-400">{subtitle}</div>
          </div>
        </div>

        {/* Placeholder bubbles */}
        <div className="space-y-4">
          {/* left bubbles */}
          <div className="flex">
            <div className="max-w-[70%] rounded-2xl rounded-tl-md bg-gray-800/60 p-3 ring-1 ring-gray-700">
              <div className="mb-2 h-3 w-40 animate-pulse rounded bg-gray-700" />
              <div className="h-3 w-24 animate-pulse rounded bg-gray-700/80" />
            </div>
          </div>
          <div className="flex">
            <div className="max-w-[55%] rounded-2xl rounded-tl-md bg-gray-800/60 p-3 ring-1 ring-gray-700">
              <div className="mb-2 h-3 w-28 animate-pulse rounded bg-gray-700" />
              <div className="h-3 w-20 animate-pulse rounded bg-gray-700/80" />
            </div>
          </div>
          {/* right bubbles */}
          <div className="flex justify-end">
            <div className="max-w-[60%] rounded-2xl rounded-tr-md bg-emerald-900/30 p-3 ring-1 ring-emerald-800/60">
              <div className="mb-2 h-3 w-36 animate-pulse rounded bg-emerald-800/60" />
              <div className="h-3 w-16 animate-pulse rounded bg-emerald-800/40" />
            </div>
          </div>
          <div className="flex">
            <div className="max-w-[65%] rounded-2xl rounded-tl-md bg-gray-800/60 p-3 ring-1 ring-gray-700">
              <div className="mb-2 h-3 w-44 animate-pulse rounded bg-gray-700" />
              <div className="h-3 w-24 animate-pulse rounded bg-gray-700/80" />
            </div>
          </div>
        </div>

        {/* Input bar skeleton */}
        <div className="mt-auto flex items-center gap-2 border-t border-gray-800 pt-4">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-800" />
          <div className="h-10 grow animate-pulse rounded-md bg-gray-800" />
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-800" />
        </div>
      </div>
    </div>
  );
}
