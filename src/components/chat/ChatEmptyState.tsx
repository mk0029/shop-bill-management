"use client";

import React from "react";
import { MessageSquare, Search } from "lucide-react";

type Props = {
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
};

export function ChatEmptyState({
  title = "Select a chat",
  subtitle = "Choose a customer to start messaging",
  showHeader = false,
}: Props) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Optional inline header bar */}
      {showHeader && (
        <div className="border-b border-gray-700 bg-gray-900/90 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700">
              <MessageSquare className="h-4 w-4 text-gray-300" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{title}</div>
              <div className="text-[11px] text-gray-400">{subtitle}</div>
            </div>
          </div>
        </div>
      )}

      {/* Center content */}
      <div className="flex grow items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800/80 ring-1 ring-gray-700">
            <Search className="h-6 w-6 text-gray-300" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-gray-200">{title} to start messaging</h2>
            <p className="text-sm text-gray-400">
              Pick a conversation from the left. You can search customers, view recent chats,
              or create a new chat from the top bar.
            </p>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-gray-700/80 bg-gray-900/60 px-4 py-3 text-left">
              <div className="text-xs font-medium text-gray-300">Tip</div>
              <div className="text-xs text-gray-400">Use the search to quickly find a customer</div>
            </div>
            <div className="rounded-md border border-gray-700/80 bg-gray-900/60 px-4 py-3 text-left">
              <div className="text-xs font-medium text-gray-300">Shortcut</div>
              <div className="text-xs text-gray-400">Press “/” to focus search (if available)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
