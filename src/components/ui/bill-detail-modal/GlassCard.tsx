"use client";

import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-card-static",
        hover && "glass-card-shine transition-all duration-500 hover:bg-white/[0.07] hover:shadow-[0_12px_48px_rgba(0,0,0,0.35),0_0_30px_rgba(56,189,248,0.05)] hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GlassCardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-3",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-white/80 tracking-tight">
        {title}
      </h3>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
