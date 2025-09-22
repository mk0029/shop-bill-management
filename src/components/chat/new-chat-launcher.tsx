"use client";

import React, { useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useCustomers } from "@/hooks/use-sanity-data";
import { CustomerSelection } from "@/components/forms/bill-form/customer-selection";

export default function NewChatLauncher(props: { onClose: () => void; onRoomOpen: (roomId: string) => void }) {
  const { openRoomByCustomer } = useChatStore();
  const { customers, isLoading } = useCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);


  const startChat = async () => {
    if (!selectedCustomerId) {
      setError("Please select a customer");
      return;
    }
    
    try {
      setIsStarting(true);
      setError(null);
      const roomId = await openRoomByCustomer(selectedCustomerId);
      // Just pass the roomId to the callback - no URL navigation needed
      props.onRoomOpen(roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start chat");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="w-[560px] max-w-[92vw] bg-white/60 dark:bg-zinc-900/60 border rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold">Start new chat</h3>
          <button onClick={props.onClose} className="text-sm px-2 py-1 rounded border bg-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60">Close</button>
        </div>
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="text-sm opacity-70">Loading customers...</div>
          ) : (
            <CustomerSelection
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              onCustomerChange={setSelectedCustomerId}
            />
          )}
          
          {error && <div className="text-sm text-red-600">{error}</div>}
          
          <div className="flex justify-end gap-2">
            <button 
              onClick={props.onClose}
              className="px-4 py-2 text-sm rounded border bg-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60"
            >
              Cancel
            </button>
            <button 
              onClick={startChat}
              disabled={!selectedCustomerId || isStarting}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? "Starting..." : "Start Chat"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
