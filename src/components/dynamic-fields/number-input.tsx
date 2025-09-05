/**
 * Number Input Component for Dynamic Fields
 */

import React from "react";
import { Input } from "@/components/ui/input";
import {
  FieldWrapper,
  useBaseField,
  BaseFieldProps,
} from "./base-field-component";
import { cn } from "@/lib/utils";

export interface NumberInputProps extends BaseFieldProps {
  min?: number;
  max?: number;
  step?: number;
}

export const NumberInput: React.FC<NumberInputProps> = (props) => {
  const { config, value, disabled, readonly, className, ...baseProps } = props;

  const {
    fieldId,
    handleChange,
    handleBlur,
    handleFocus,
    fieldStateClasses,
    getDisplayValue,
  } = useBaseField(props);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty string for clearing the field
    if (inputValue === "") {
      handleChange("");
      return;
    }

    // Parse number
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue)) {
      handleChange(numValue);
    }
  };

  const min = props.min ?? config.validation?.min;
  const max = props.max ?? config.validation?.max;
  const step =
    props.step ??
    (config.formatting?.decimalPlaces
      ? Math.pow(10, -config.formatting.decimalPlaces)
      : 1);

  // Format display value
  const displayValue = React.useMemo(() => {
    if (value === null || value === undefined || value === "") {
      return "";
    }

    // For number inputs, we don't show prefix/suffix in the input field
    // They're shown in the label or description instead
    if (
      typeof value === "number" &&
      config.formatting?.decimalPlaces !== undefined
    ) {
      return value.toFixed(config.formatting.decimalPlaces);
    }

    return String(value);
  }, [value, config.formatting]);

  return (
    <FieldWrapper config={config} {...baseProps}>
      <div className="relative">
        {config.formatting?.prefix && (
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {config.formatting.prefix}
          </span>
        )}

        <Input
          id={fieldId}
          type="number"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          readOnly={readonly}
          placeholder={config.placeholder}
          min={min}
          max={max}
          step={step}
          className={cn(
            "bg-gray-800 border-gray-700 text-white placeholder-gray-400",
            config.formatting?.prefix && "pl-8",
            config.formatting?.suffix && "pr-8",
            fieldStateClasses,
            className
          )}
          data-testid={props["data-testid"]}
        />

        {config.formatting?.suffix && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
            {config.formatting.suffix}
          </span>
        )}
      </div>
    </FieldWrapper>
  );
};
