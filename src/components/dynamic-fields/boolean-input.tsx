/**
 * Boolean Input Component for Dynamic Fields
 */

import React from "react";
import {
  FieldWrapper,
  useBaseField,
  BaseFieldProps,
} from "./base-field-component";
import { cn } from "@/lib/utils";

export interface BooleanInputProps extends BaseFieldProps {
  variant?: "checkbox" | "toggle" | "radio";
  trueLabel?: string;
  falseLabel?: string;
}

export const BooleanInput: React.FC<BooleanInputProps> = (props) => {
  const {
    config,
    value,
    disabled,
    readonly,
    className,
    variant = "checkbox",
    trueLabel = "Yes",
    falseLabel = "No",
    ...baseProps
  } = props;

  const { fieldId, handleChange, fieldStateClasses } = useBaseField(props);

  // Normalize boolean value
  const booleanValue = React.useMemo(() => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true";
    return false;
  }, [value]);

  const handleBooleanChange = (newValue: boolean) => {
    handleChange(newValue);
  };

  // Checkbox variant
  if (variant === "checkbox") {
    return (
      <FieldWrapper config={config} {...baseProps}>
        <div className="flex items-center space-x-2">
          <input
            id={fieldId}
            type="checkbox"
            checked={booleanValue}
            onChange={(e) => handleBooleanChange(e.target.checked)}
            disabled={disabled || readonly}
            className={cn(
              "w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded",
              "focus:ring-blue-500 focus:ring-2",
              fieldStateClasses,
              className
            )}
            data-testid={props["data-testid"]}
          />
          <label
            htmlFor={fieldId}
            className="text-sm text-gray-300 cursor-pointer">
            {config.description || config.label}
          </label>
        </div>
      </FieldWrapper>
    );
  }

  // Toggle variant
  if (variant === "toggle") {
    return (
      <FieldWrapper config={config} {...baseProps}>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() =>
              !disabled && !readonly && handleBooleanChange(!booleanValue)
            }
            disabled={disabled || readonly}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800",
              booleanValue ? "bg-blue-600" : "bg-gray-600",
              disabled && "opacity-50 cursor-not-allowed",
              fieldStateClasses,
              className
            )}
            data-testid={props["data-testid"]}>
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                booleanValue ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
          <span className="text-sm text-gray-300">
            {booleanValue ? trueLabel : falseLabel}
          </span>
        </div>
      </FieldWrapper>
    );
  }

  // Radio variant
  if (variant === "radio") {
    return (
      <FieldWrapper config={config} {...baseProps}>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <input
              id={`${fieldId}-true`}
              type="radio"
              name={fieldId}
              checked={booleanValue === true}
              onChange={() => handleBooleanChange(true)}
              disabled={disabled || readonly}
              className={cn(
                "w-4 h-4 text-blue-600 bg-gray-800 border-gray-700",
                "focus:ring-blue-500 focus:ring-2",
                fieldStateClasses
              )}
            />
            <label
              htmlFor={`${fieldId}-true`}
              className="text-sm text-gray-300 cursor-pointer">
              {trueLabel}
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id={`${fieldId}-false`}
              type="radio"
              name={fieldId}
              checked={booleanValue === false}
              onChange={() => handleBooleanChange(false)}
              disabled={disabled || readonly}
              className={cn(
                "w-4 h-4 text-blue-600 bg-gray-800 border-gray-700",
                "focus:ring-blue-500 focus:ring-2",
                fieldStateClasses
              )}
            />
            <label
              htmlFor={`${fieldId}-false`}
              className="text-sm text-gray-300 cursor-pointer">
              {falseLabel}
            </label>
          </div>
        </div>
      </FieldWrapper>
    );
  }

  return null;
};
