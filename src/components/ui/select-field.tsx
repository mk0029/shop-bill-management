"use client";

import React from "react";
import { Label } from "./label";
import { AlertCircle } from "lucide-react";
import { Dropdown } from "./dropdown";
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

      <Dropdown
        options={options}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`${hasError ? "border-red-500" : ""} ${className}`}
        searchable={options.length > 10}
      />

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
