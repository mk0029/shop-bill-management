import React from "react";

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

const UnreadBadge: React.FC<UnreadBadgeProps> = ({ count, className = "" }) => {
  if (!count || count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-semibold leading-4 text-white shadow-[0_6px_16px_rgba(16,185,129,0.35)] ${className}`}
      aria-label={`${label} unread`}
    >
      {label}
    </span>
  );
};

export default UnreadBadge;

