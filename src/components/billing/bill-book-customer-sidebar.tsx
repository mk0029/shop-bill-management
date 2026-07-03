"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useCustomerStats } from "@/hooks/use-customer-stats";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { safeInitial, safeUserName } from "@/lib/display-text";
import { getAdminCustomerDisplayName } from "@/lib/customer-utils";

type Props = {
  selectedUserId?: string;
  onSelect?: (userId: string) => void;
};

export default function BillBookCustomerSidebar({ selectedUserId, onSelect }: Props) {
  const { customersWithStats, isLoadingCustomers } = useCustomerStats();
  const [q, setQ] = useState("");
  const [sortMode, setSortMode] = useState<"recent" | "bill">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("bb_sidebar_sort") as "recent" | "bill") || "recent";
    }
    return "recent";
  });
  const [activity, setActivity] = useState<Record<string, string | null>>({});
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    // Persist sort mode
    try { localStorage.setItem("bb_sidebar_sort", sortMode); } catch {}
  }, [sortMode]);

  useEffect(() => {
    if (sortMode !== "recent") return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/bill-book/message-activity").then(r => r.json());
        if (alive && res?.success) {
          const map: Record<string, string | null> = {};
          for (const row of res.data as Array<{ userId: string; lastMessageAt: string | null }>) {
            map[row.userId] = row.lastMessageAt;
          }
          setActivity(map);
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [sortMode]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customersWithStats;
    return customersWithStats.filter((c) =>
      [c.name, c.phone, c.email, c.location]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [q, customersWithStats]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortMode === "recent") {
        const ad = activity[a._id] ? new Date(activity[a._id] as string).getTime() : 0;
        const bd = activity[b._id] ? new Date(activity[b._id] as string).getTime() : 0;
        return bd - ad;
      }
      const ad = a.lastBillDate ? new Date(a.lastBillDate).getTime() : 0;
      const bd = b.lastBillDate ? new Date(b.lastBillDate).getTime() : 0;
      return bd - ad;
    });
  }, [filtered, sortMode, activity]);

  const handleSelect = (userId: string) => {
    try {
      const params = new URLSearchParams(search?.toString() || "");
      params.set("userId", userId);
      router.replace(`${pathname}?${params.toString()}`);
    } catch {}
    onSelect?.(userId);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white/60 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => router.push("/admin/dashboard")}
          className="mb-2 inline-flex items-center gap-2 px-2.5 py-1.5 text-sm rounded border bg-transparent hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="opacity-70">Sort:</span>
          <button
            type="button"
            onClick={() => setSortMode("recent")}
            className={`px-2 py-1 rounded border ${sortMode === 'recent' ? 'bg-black text-white dark:bg-white dark:text-black' : ''}`}
          >Recent</button>
          <button
            type="button"
            onClick={() => setSortMode("bill")}
            className={`px-2 py-1 rounded border ${sortMode === 'bill' ? 'bg-black text-white dark:bg-white dark:text-black' : ''}`}
          >Bills</button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search customers..."
          className="w-full bg-transparent border rounded-md px-3 py-2 text-sm focus:outline-none"
        />
      </div>
      <div className="flex-1 overflow-auto">
        {isLoadingCustomers ? (
          <div className="p-4 text-sm opacity-70">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm opacity-70">No customers found</div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sorted.map((c) => {
              const active = c._id === selectedUserId;
              return (
                <li key={c._id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(c._id)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 ${
                      active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                      {safeInitial(c.name || c.phone, "U")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{safeUserName(getAdminCustomerDisplayName(c), "Customer")}</p>
                        {c.lastBillDate && (
                          <span className="text-xs opacity-70 whitespace-nowrap">{c.lastBillDate}</span>
                        )}
                      </div>
                      <p className="text-xs opacity-70 truncate">
                        {sortMode === 'recent' ? (
                          activity[c._id] ? `Last message: ${new Date(activity[c._id] as string).toLocaleDateString()}` : 'No messages yet'
                        ) : (
                          `${c.totalBills} bill${c.totalBills === 1 ? '' : 's'} • ₹${Math.round(c.totalSpent).toLocaleString()}`
                        )}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
