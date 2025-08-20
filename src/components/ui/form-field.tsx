"use client";

import React from "react";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { AlertCircle } from "lucide-react";
import { FormFieldProps } from "@/types";

interface EnhancedFormFieldProps extends FormFieldProps {
  type?: "text" | "email" | "number" | "number" | "password" | "textarea";
  rows?: number;
  className?: string;
  helpText?: string;
}

export function FormField({
  label,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  placeholder,
  type = "text",
  rows = 3,
  className = "",
  helpText,
}: EnhancedFormFieldProps) {
  const fieldId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const hasError = !!error;

  const inputProps = {
    id: fieldId,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    placeholder,
    disabled,
    className: `${
      hasError ? "border-red-500 focus:border-red-500" : ""
    } ${className}`,
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>

      {type === "textarea" ? (
        <Textarea {...inputProps} rows={rows} />
      ) : (
        <Input {...inputProps} type={type} />
      )}

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
