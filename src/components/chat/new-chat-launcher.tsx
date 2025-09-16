"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useChatStore } from "@/store/chat-store";

type UserLite = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export default function NewChatLauncher(props: { onClose: () => void; onRoomOpen: (roomId: string) => void }) {
  const { openRoomByCustomer } = useChatStore();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    const run = async () => {
      const term = q.trim();
      if (!term) { setResults([]); return; }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(term)}&limit=20`, { cache: "no-store" });
        const json = await res.json();
        if (!aborted) {
          const users = (json?.users || []).map((u: any) => ({ id: String(u.id), name: u.name ?? null, email: u.email ?? null, phone: u.phone ?? null })) as UserLite[];
          setResults(users);
        }
      } catch (e: any) {
        if (!aborted) setError(e?.message || "Search failed");
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => { aborted = true; clearTimeout(t); };
  }, [q]);

  const startChat = async (customerId: string) => {
    try {
      const roomId = await openRoomByCustomer(customerId);
      props.onRoomOpen(roomId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start chat");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-[560px] max-w-[92vw] bg-white/60 dark:bg-zinc-900/60 border rounded-lg shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-semibold">Start new chat</h3>
          <button onClick={props.onClose} className="text-sm px-2 py-1 rounded border bg-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60">Close</button>
        </div>
        <div className="p-4 space-y-3">
          <input
            autoFocus
            placeholder="Search customers by name, email, phone…"
            className="w-full border rounded px-3 py-2 bg-transparent"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="max-h-[50vh] overflow-y-auto border rounded">
            {loading ? (
              <div className="p-3 text-sm">Searching…</div>
            ) : results.length === 0 ? (
              <div className="p-3 text-sm opacity-70">No results</div>
            ) : (
              <ul>
                {results.map((u) => (
                  <li key={u.id} className="p-3 border-b last:border-b-0 flex items-center justify-between hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60">
                    <div>
                      <div className="text-sm font-medium">{u.name || "Unnamed"}</div>
                      <div className="text-xs opacity-70">
                        {[u.email, u.phone].filter(Boolean).join(" • ")}
                      </div>
                    </div>
                    <button className="px-3 py-1.5 text-sm rounded border bg-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60" onClick={() => startChat(u.id)}>Start</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
