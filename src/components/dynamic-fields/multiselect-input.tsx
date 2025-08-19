/**
 * Multi-Select Input Component for Dynamic Fields
 */

import React from "react";
import {
  FieldWrapper,
  useBaseField,
  BaseFieldProps,
} from "./base-field-component";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, ChevronDown } from "lucide-react";

export interface MultiSelectInputProps extends BaseFieldProps {
  maxSelections?: number;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = (props) => {
  const {
    config,
    value,
    disabled,
    readonly,
    className,
    maxSelections,
    ...baseProps
  } = props;

  const { fieldId, handleChange, fieldStateClasses } = useBaseField(props);

  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Ensure value is always an array
  const selectedValues = React.useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  // Handle option selection
  const handleOptionToggle = (optionValue: string) => {
    if (disabled || readonly) return;

    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];

    // Check max selections limit
    if (maxSelections && newValues.length > maxSelections) {
      return;
    }

    handleChange(newValues);
  };

  // Remove selected value
  const handleRemoveValue = (valueToRemove: string) => {
    if (disabled || readonly) return;

    const newValues = selectedValues.filter((v) => v !== valueToRemove);
    handleChange(newValues);
  };

  // Clear all selections
  const handleClearAll = () => {
    if (disabled || readonly) return;
    handleChange([]);
  };

  // Get option label by value
  const getOptionLabel = (optionValue: string): string => {
    const option = config.options?.find((opt) => opt.value === optionValue);
    return option?.label || optionValue;
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Available options (not disabled)
  const availableOptions = React.useMemo(() => {
    return config.options?.filter((option) => !option.disabled) || [];
  }, [config.options]);

  return (
    <FieldWrapper config={config} {...baseProps}>
      <div className="relative" ref={dropdownRef}>
        {/* Selected Values Display */}
        <div
          className={cn(
            "min-h-[40px] w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            fieldStateClasses,
            className
          )}
          onClick={() => !disabled && !readonly && setIsOpen(!isOpen)}>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedValues.length === 0 ? (
                <span className="text-gray-400">
                  {config.placeholder || `Select ${config.label.toLowerCase()}`}
                </span>
              ) : (
                selectedValues.map((selectedValue) => (
                  <span
                    key={selectedValue}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-sm rounded">
                    {getOptionLabel(selectedValue)}
                    {!disabled && !readonly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveValue(selectedValue);
                        }}
                        className="hover:bg-blue-700 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>

            <div className="flex items-center gap-1">
              {selectedValues.length > 0 && !disabled && !readonly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  className="text-gray-400 hover:text-white p-1"
                  title="Clear all">
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-gray-400 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </div>
        </div>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl shadow-black/50 z-50 max-h-60 overflow-auto">
            {availableOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400 text-center">
                No options available
              </div>
            ) : (
              availableOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                const isDisabled =
                  maxSelections &&
                  !isSelected &&
                  selectedValues.length >= maxSelections;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionToggle(option.value)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm transition-colors duration-150 flex items-center justify-between",
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isDisabled
                          ? "text-gray-500 cursor-not-allowed"
                          : "text-white hover:bg-gray-700 cursor-pointer"
                    )}>
                    <span>{option.label}</span>
                    {isSelected && <span className="text-blue-200">✓</span>}
                  </button>
                );
              })
            )}

            {/* Max selections warning */}
            {maxSelections && selectedValues.length >= maxSelections && (
              <div className="px-3 py-2 text-xs text-yellow-400 border-t border-gray-700">
                Maximum {maxSelections} selections allowed
              </div>
            )}
          </div>
        )}
      </div>
    </FieldWrapper>
  );
};
