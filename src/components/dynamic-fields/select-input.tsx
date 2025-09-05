/**
 * Select Input Component for Dynamic Fields
 */

import React from "react";
import { Dropdown } from "@/components/ui/dropdown";
import {
  FieldWrapper,
  useBaseField,
  BaseFieldProps,
} from "./base-field-component";
import { cn } from "@/lib/utils";

export interface SelectInputProps extends BaseFieldProps {
  searchable?: boolean;
}

export const SelectInput: React.FC<SelectInputProps> = (props) => {
  const {
    config,
    value,
    disabled,
    readonly,
    className,
    searchable,
    ...baseProps
  } = props;

  const { fieldId, handleChange, fieldStateClasses } = useBaseField(props);

  const handleSelectChange = (selectedValue: string) => {
    handleChange(selectedValue);
  };

  // Prepare options for the dropdown
  const options = React.useMemo(() => {
    if (!config.options || config.options.length === 0) {
      return [];
    }

    return config.options
      .filter((option) => !option.disabled)
      .map((option) => ({
        value: option.value,
        label: option.label,
        disabled: option.disabled || false,
      }));
  }, [config.options]);

  // Group options if they have groups
  const groupedOptions = React.useMemo(() => {
    if (!config.options) return options;

    const hasGroups = config.options.some((option) => option.group);
    if (!hasGroups) return options;

    // Group options by their group property
    const groups = config.options.reduce(
      (acc, option) => {
        const group = option.group || "Other";
        if (!acc[group]) acc[group] = [];
        acc[group].push({
          value: option.value,
          label: option.label,
          disabled: option.disabled || false,
        });
        return acc;
      },
      {} as Record<
        string,
        Array<{ value: string; label: string; disabled: boolean }>
      >
    );

    // Flatten with group separators (if dropdown supports it)
    return Object.entries(groups).flatMap(([groupName, groupOptions]) => [
      {
        value: `__group_${groupName}`,
        label: `--- ${groupName} ---`,
        disabled: true,
      },
      ...groupOptions,
    ]);
  }, [config.options, options]);

  return (
    <FieldWrapper config={config} {...baseProps}>
      <Dropdown
        options={groupedOptions}
        value={value || ""}
        onValueChange={handleSelectChange}
        placeholder={
          config.placeholder || `Select ${config.label.toLowerCase()}`
        }
        disabled={disabled || readonly}
        searchable={searchable}
        className={cn(
          "bg-gray-800 border-gray-700 text-white",
          fieldStateClasses,
          className
        )}
        data-testid={props["data-testid"]}
      />
    </FieldWrapper>
  );
};
