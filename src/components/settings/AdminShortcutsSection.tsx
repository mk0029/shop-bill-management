"use client";

import React from "react";
import Link from "next/link";
import { Settings, UserCog, ListChecks, PackageSearch } from "lucide-react";

export default function AdminShortcutsSection() {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="border-b border-white/5 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Settings className="h-4 w-4 text-emerald-300/90" /> Quick Shortcuts
        </h2>
      </div>
      <div className="p-4 sm:p-5">
        <p className="mb-3 text-xs text-slate-400">Jump to frequently used admin pages.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link href="/admin/manage-admins">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.98] backdrop-blur-xl">
              <UserCog className="h-4 w-4 text-emerald-300/80" /> Manage Admins
            </div>
          </Link>
          <Link href="/admin/specifications">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.98] backdrop-blur-xl">
              <ListChecks className="h-4 w-4 text-emerald-300/80" /> Specifications
            </div>
          </Link>
          <Link href="/admin/inventory">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.98] backdrop-blur-xl">
              <PackageSearch className="h-4 w-4 text-emerald-300/80" /> Inventory
            </div>
          </Link>
          <Link href="/admin/billing">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.98] backdrop-blur-xl">
              <Settings className="h-4 w-4 text-emerald-300/80" /> Billing
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
