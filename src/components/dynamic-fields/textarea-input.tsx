/**
 * Textarea Input Component for Dynamic Fields
 */

import React from "react";
import {
  FieldWrapper,
  useBaseField,
  BaseFieldProps,
} from "./base-field-component";
import { cn } from "@/lib/utils";

export interface TextareaInputProps extends BaseFieldProps {
  rows?: number;
  maxLength?: number;
  minLength?: number;
  resize?: "none" | "vertical" | "horizontal" | "both";
  showCharacterCount?: boolean;
}

export const TextareaInput: React.FC<TextareaInputProps> = (props) => {
  const {
    config,
    value,
    disabled,
    readonly,
    className,
    rows = 4,
    resize = "vertical",
    showCharacterCount = true,
    ...baseProps
  } = props;

  const { fieldId, handleChange, handleBlur, handleFocus, fieldStateClasses } =
    useBaseField(props);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange(e.target.value);
  };

  const maxLength = props.maxLength || config.validation?.maxLength;
  const minLength = props.minLength || config.validation?.minLength;
  const currentLength = value ? String(value).length : 0;

  const resizeClass = {
    none: "resize-none",
    vertical: "resize-y",
    horizontal: "resize-x",
    both: "resize",
  }[resize];

  return (
    <FieldWrapper config={config} {...baseProps}>
      <div className="relative">
        <textarea
          id={fieldId}
          value={value || ""}
          onChange={handleTextareaChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          readOnly={readonly}
          placeholder={config.placeholder}
          rows={rows}
          maxLength={maxLength}
          minLength={minLength}
          className={cn(
            "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            resizeClass,
            fieldStateClasses,
            className
          )}
          data-testid={props["data-testid"]}
        />

        {/* Character count */}
        {showCharacterCount && maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            <span
              className={cn(
                currentLength > maxLength * 0.9 &&
                  currentLength < maxLength &&
                  "text-yellow-400",
                currentLength >= maxLength && "text-red-400"
              )}>
              {currentLength}
            </span>
            <span className="text-gray-500">/{maxLength}</span>
          </div>
        )}
      </div>

      {/* Character count below (alternative position) */}
      {showCharacterCount && maxLength && !props.showCharacterCount && (
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>
            {minLength && currentLength < minLength && (
              <span className="text-yellow-400">
                Minimum {minLength} characters required
              </span>
            )}
          </span>
          <span
            className={cn(
              currentLength > maxLength * 0.9 &&
                currentLength < maxLength &&
                "text-yellow-400",
              currentLength >= maxLength && "text-red-400"
            )}>
            {currentLength}/{maxLength}
          </span>
        </div>
      )}
    </FieldWrapper>
  );
};
