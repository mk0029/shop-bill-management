"use client";

import React from "react";
import { Label } from "./label";
import { AlertCircle, ChevronDown } from "lucide-react";
import { DropdownOption } from "@/types";

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  helpText?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  disabled = false,
  required = false,
  placeholder = "Select an option...",
  className = "",
  helpText,
}: SelectFieldProps) {
  const fieldId = `select-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const hasError = !!error;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      <div className="relative">
        <select
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 border rounded-md bg-white text-gray-900
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            appearance-none pr-10
            ${
              hasError
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300"
            }
            ${className}
          `}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}

      {error && (
        <div className="flex items-center gap-1 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs">{error}</span>
        </div>
      )}
    </div>
  );
}
