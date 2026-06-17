"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowLeft,
  FileSearch,
  Home,
  Plus,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
};

type EmptyStateProps = {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: ComponentType<{ className?: string }>;
  actions?: EmptyStateAction[];
  compact?: boolean;
};

export default function EmptyState({
  title,
  description,
  eyebrow = "Nothing here yet",
  icon: Icon = FileSearch,
  actions = [],
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-sky-300/15 bg-slate-950/58 text-center shadow-2xl shadow-black/20 backdrop-blur-2xl ${
        compact ? "p-5 sm:p-6" : "p-7 sm:p-9"
      }`}
    >
      <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/16 blur-3xl" />
      <div className="absolute -bottom-16 right-8 h-44 w-44 rounded-full bg-orange-300/12 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(125,211,252,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.18)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto max-w-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-orange-200 shadow-lg shadow-orange-950/20 backdrop-blur-xl">
          <Icon className="h-8 w-8" />
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
          <Sparkles className="h-3.5 w-3.5 text-orange-200" />
          {eyebrow}
        </div>

        <h2 className="mt-3 text-2xl font-bold tracking-normal text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
          {description}
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {[
            ["Clean records", FileSearch],
            ["Fast updates", Wrench],
            ["Ready when needed", Plus],
          ].map(([label, ChipIcon]) => {
            const TypedIcon = ChipIcon as typeof FileSearch;
            return (
              <div
                key={String(label)}
                className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-left text-xs font-medium text-slate-200"
              >
                <TypedIcon className="mb-1.5 h-4 w-4 text-sky-200" />
                {label}
              </div>
            );
          })}
        </div>

        {actions.length > 0 && (
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {actions.map((action) => {
              const content = (
                <Button
                  type="button"
                  onClick={action.onClick}
                  variant={
                    action.variant === "secondary" ? "outline" : "default"
                  }
                  className={
                    action.variant === "secondary"
                      ? "border-white/15 bg-slate-950/60 text-white hover:bg-slate-900"
                      : "bg-orange-400 font-semibold text-slate-950 hover:bg-orange-300"
                  }
                >
                  {action.variant === "secondary" ? (
                    <ArrowLeft className="mr-2 h-4 w-4" />
                  ) : (
                    <Home className="mr-2 h-4 w-4" />
                  )}
                  {action.label}
                </Button>
              );

              return action.href ? (
                <Link key={action.label} href={action.href}>
                  {content}
                </Link>
              ) : (
                <span key={action.label}>{content}</span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
