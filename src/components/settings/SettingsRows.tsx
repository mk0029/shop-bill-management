"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import type { SettingNode } from "@/lib/settings/settings-config";

export function SettingsSection({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden border-y border-slate-800 bg-slate-950/60 sm:rounded-lg sm:border">
      {(title || action) && (
        <div className="flex min-h-11 items-center justify-between border-b border-slate-800 px-4">
          {title ? <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2> : <span />}
          {action}
        </div>
      )}
      <div className="divide-y divide-slate-800">{children}</div>
    </section>
  );
}

export function SettingsCategory({
  node,
  href,
  favorite,
  status,
  onToggleFavorite,
}: {
  node: SettingNode;
  href: string;
  favorite?: boolean;
  status?: string;
  onToggleFavorite?: () => void;
}) {
  const Icon = node.icon;
  return (
    <div className="group flex min-h-20 items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-900">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-900 text-blue-300 ring-1 ring-slate-800">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-100">{node.title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-400">{node.description}</span>
          {status ? <span className="mt-1 block text-xs font-medium text-blue-300">{status}</span> : null}
        </span>
      </Link>
      {onToggleFavorite && (
        <button
          type="button"
          aria-label={favorite ? "Remove favorite" : "Add favorite"}
          onClick={onToggleFavorite}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-800 hover:text-amber-300"
        >
          <Star className={`h-4 w-4 ${favorite ? "fill-amber-300 text-amber-300" : ""}`} />
        </button>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
    </div>
  );
}

export function SettingsOption({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-100">{title}</div>
        {description && <div className="mt-0.5 text-xs leading-5 text-slate-400">{description}</div>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
