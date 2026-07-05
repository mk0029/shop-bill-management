"use client";

import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import type { SettingNode } from "@/lib/settings/settings-config";

const rowClasses =
  "flex min-h-[68px] items-center gap-3 px-4 py-3 transition-all duration-200 cursor-pointer group hover:bg-white/[0.09] active:scale-[0.99] sm:px-5";
const linkClasses = "flex min-w-0 flex-1 items-center gap-3.5";

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
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-shadow duration-300 hover:shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
      {(title || action) && (
        <div className="flex min-h-11 items-center justify-between border-b border-white/5 px-4 py-2.5 sm:px-5">
          {title ? (
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className="divide-y divide-white/[0.04]">{children}</div>
    </section>
  );
}

export function SettingsCategory({
  node,
  href,
  favorite,
  status,
  onToggleFavorite,
  index = 0,
}: {
  node: SettingNode;
  href: string;
  favorite?: boolean;
  status?: string;
  onToggleFavorite?: () => void;
  index?: number;
}) {
  const Icon = node.icon;
  return (
    <div className={rowClasses}>
      <Link href={href} className={linkClasses}>
        <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] ring-1 ring-white/10 transition-all duration-300 group-hover:ring-emerald-400/30 group-hover:shadow-[0_0_20px_rgba(52,211,153,0.12)]">
          <Icon className="h-5 w-5 text-emerald-300/90 transition-colors duration-300 group-hover:text-emerald-200" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-100 transition-colors duration-200 group-hover:text-white">
            {node.title}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-400 transition-colors duration-200 group-hover:text-slate-300">
            {node.description}
          </span>
          {status ? (
            <span className="mt-1 block text-[11px] font-medium text-emerald-300/80">
              {status}
            </span>
          ) : null}
        </span>
      </Link>
      {onToggleFavorite && (
        <button
          type="button"
          aria-label={favorite ? "Remove favorite" : "Add favorite"}
          onClick={onToggleFavorite}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-white/[0.08] hover:text-amber-300 active:scale-90"
        >
          <Star
            className={`h-4 w-4 transition-all duration-200 ${favorite ? "fill-amber-300 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]" : ""}`}
          />
        </button>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-300" />
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
    <div className="flex min-h-[60px] items-center justify-between gap-4 px-4 py-3 transition-colors duration-200 hover:bg-white/[0.04] sm:px-5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-100">{title}</div>
        {description && (
          <div className="mt-0.5 text-xs leading-5 text-slate-400">
            {description}
          </div>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
