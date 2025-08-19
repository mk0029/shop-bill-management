"use client";

import React from "react";
import { Button } from "./button";
import { LoadingSpinner } from "./loading-spinner";
import { ActionButtonProps } from "@/types";
import { cn } from "@/lib/utils";

export function ActionButton({
  onClick,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "md",
  icon,
  children,
  ...props
}: ActionButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const isDisabled = disabled || loading;

  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-600 hover:bg-gray-700 text-white",
    outline: "border border-gray-300 hover:bg-gray-50 text-gray-700",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "flex items-center justify-center gap-2 transition-all duration-200",
        variantClasses[variant],
        sizeClasses[size],
        isDisabled && "opacity-50 cursor-not-allowed"
      )}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </Button>
  );
}
