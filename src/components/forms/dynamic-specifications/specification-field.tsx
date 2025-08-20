import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownOption } from "@/types";

interface SpecificationFieldProps {
  fieldDefinition: any;
  fieldName: string;
  fieldValue: string;
  isRequired: boolean;
  hasError: boolean;
  errorMessage?: string;
  disabled?: boolean;
  onFieldChange: (field: string, value: string) => void;
}
function convertBoldToEm(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "&nbsp;<sup>$1</sup>");
}
function removeBold(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, " $1");
}
export function SpecificationField({
  fieldDefinition,
  fieldName,
  fieldValue,
  isRequired,
  hasError,
  errorMessage,
  disabled = false,
  onFieldChange,
}: SpecificationFieldProps) {
  const { fieldLabel, fieldType, options } = fieldDefinition;

  const label = `${fieldLabel}${isRequired ? " *" : ""}`;
  const placeholder =
    fieldDefinition.placeholder || `Enter ${fieldLabel.toLowerCase()}`;
  const fieldClassName = `bg-gray-800 border-gray-700 ${
    hasError ? "border-red-500" : ""
  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  const renderField = () => {
    switch (fieldType) {
      case "select":
        return (
          <Dropdown
            options={
              options?.map((opt: any) => ({
                value: opt.value,
                label: opt.title,
              })) || []
            }
            value={fieldValue}
            onValueChange={(value) => onFieldChange(fieldName, value)}
            placeholder={removeBold(placeholder)}
            disabled={disabled || !options || options.length === 0}
            className={fieldClassName}
          />
        );
      case "number":
      case "text":
        return (
          <Input
            id={fieldName}
            type={fieldType}
            value={fieldValue}
            onChange={(e) => onFieldChange(fieldName, e.target.value)}
            placeholder={removeBold(placeholder)}
            disabled={disabled}
            className={fieldClassName}
          />
        );
      case "radio":
        return (
          <div className="flex flex-col space-y-2 pt-2">
            {options?.map((opt: any) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${fieldName}-${opt.value}`}
                  name={fieldName}
                  value={opt.value}
                  checked={fieldValue === opt.value}
                  onChange={() => onFieldChange(fieldName, opt.value)}
                  disabled={disabled}
                  className="form-radio h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 "
                />
                <Label
                  htmlFor={`${fieldName}-${opt.value}`}
                  className="text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html: convertBoldToEm(opt.title),
                  }}
                />
              </div>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id={fieldName}
              checked={fieldValue === "true"}
              onCheckedChange={(checked) =>
                onFieldChange(fieldName, String(checked))
              }
              disabled={disabled}
            />
            <Label
              htmlFor={fieldName}
              className="text-gray-300"
              dangerouslySetInnerHTML={{ __html: convertBoldToEm(fieldLabel) }}
            />
          </div>
        );
      case "multiselect":
        const selectedValues = fieldValue ? fieldValue.split(",") : [];
        return (
          <div className="flex flex-col space-y-2 pt-2">
            {options?.map((opt: any) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${fieldName}-${opt.value}`}
                  checked={selectedValues.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, opt.value]
                      : selectedValues.filter((v) => v !== opt.value);
                    onFieldChange(fieldName, newValues.join(","));
                  }}
                  disabled={disabled}
                />
                <Label
                  htmlFor={`${fieldName}-${opt.value}`}
                  className="text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html: convertBoldToEm(opt.title),
                  }}
                />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <p className="text-red-400 text-sm">
            Unsupported field type: {fieldType}
          </p>
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label
        htmlFor={fieldName}
        suppressHydrationWarning
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: convertBoldToEm(label) }}
        className="text-gray-300"
      >
        {/* {label} */}
      </Label>
      {renderField()}
      {hasError && errorMessage && (
        <p className="text-red-400 text-sm">{errorMessage}</p>
      )}
    </div>
  );
}

export default SpecificationField;
