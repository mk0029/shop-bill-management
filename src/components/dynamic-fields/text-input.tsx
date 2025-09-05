/**
 * Text Input Component for Dynamic Fields
 */

import React from "react";
import { Input } from "@/components/ui/input";
import {
  FieldWrapper,
  useBaseField,
  BaseFieldProps,
} from "./base-field-component";
import { cn } from "@/lib/utils";

export interface TextInputProps extends BaseFieldProps {
  maxLength?: number;
  minLength?: number;
}

export const TextInput: React.FC<TextInputProps> = (props) => {
  const { config, value, disabled, readonly, className, ...baseProps } = props;

  const { fieldId, handleChange, handleBlur, handleFocus, fieldStateClasses } =
    useBaseField(props);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e.target.value);
  };

  const maxLength = props.maxLength || config.validation?.maxLength;
  const minLength = props.minLength || config.validation?.minLength;

  return (
    <FieldWrapper config={config} {...baseProps}>
      <Input
        id={fieldId}
        type="text"
        value={value || ""}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled}
        readOnly={readonly}
        placeholder={config.placeholder}
        maxLength={maxLength}
        minLength={minLength}
        className={cn(
          "bg-gray-800 border-gray-700 text-white placeholder-gray-400",
          fieldStateClasses,
          className
        )}
        data-testid={props["data-testid"]}
      />
    </FieldWrapper>
  );
};
