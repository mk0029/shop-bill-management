import React from "react";
import { RefreshCw } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: " h-6 w-6 sm:w-8 sm:h-8 ",
};

export function LoadingSpinner({
  size = "md",
  text,
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <RefreshCw
        className={`${sizeClasses[size]} animate-spin text-blue-400 ${
          text ? "mr-2" : ""
        }`}
      />
      {text && <span className="text-gray-400">{text}</span>}
    </div>
  );
}

export default LoadingSpinner;
