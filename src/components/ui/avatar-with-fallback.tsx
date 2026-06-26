"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface AvatarWithFallbackProps {
  src?: string | null;
  alt?: string;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

function initials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AvatarWithFallback({
  src,
  alt = "",
  name,
  className = "",
  fallbackClassName = "",
  size = "md",
}: AvatarWithFallbackProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <Avatar className={`${sizeMap[size]} ${className}`}>
      {src && !imgError ? (
        <AvatarImage
          src={src}
          alt={alt || name || "Avatar"}
          onError={() => setImgError(true)}
          className="object-cover"
        />
      ) : null}
      <AvatarFallback className={`bg-slate-700 text-slate-300 ${fallbackClassName}`}>
        {name ? initials(name) : <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
