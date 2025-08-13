/**
 * Dynamic Form Component
 * Main form component that renders dynamic specification fields
 */

import React from "react";
import {
  SpecificationFieldConfig,
  FieldGroup,
} from "@/types/specification-field";
import {
  FormGenerationOptions,
  FormState,
  getDynamicFormGenerator,
  useDynamicFormGenerator,
} from "@/lib/form-generation-engine";
import { DynamicField } from "./ui-component-factory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Dynamic Form Props
 */
export interface DynamicFormProps {
  categoryId: string;
  initialValues?: Record<string, any>;
  onFieldChange?: (
    fieldKey: string,
    value: any,
    allValues: Record<string, any>
  ) => void;
  onValidationChange?: (
    isValid: boolean,
    errors: Record<string, string[]>
  ) => void;
  onSubmit?: (values: Record<string, any>) => void | Promise<void>;
  disabled?: boolean;
  readonly?: boolean;
  className?: string;

  // Form generation options
  includeOptionalFields?: boolean;
  groupFields?: boolean;
  enableConditionalLogic?: boolean;
  customFieldOrder?: string[];
  excludeFields?: string[];
  fieldOverrides?: Record<string, Partial<SpecificationFieldConfig>>;

  // UI options
  showGroupHeaders?: boolean;
  collapsibleGroups?: boolean;
  showSubmitButton?: boolean;
  submitButtonText?: string;
  showResetButton?: boolean;
  resetButtonText?: string;

  // Layout options
  layout?: "vertical" | "horizontal" | "grid";
  columns?: number;

  // Form wrapper options
  renderAsForm?: boolean;
}

/**
 * Field Group Component
 */
interface FieldGroupProps {
  group: FieldGroup;
  fields: SpecificationFieldConfig[];
  formState: FormState;
  onFieldChange: (fieldKey: string, value: any) => void;
  disabled?: boolean;
  readonly?: boolean;
  collapsible?: boolean;
  layout?: "vertical" | "horizontal" | "grid";
  columns?: number;
}

const FieldGroupComponent: React.FC<FieldGroupProps> = ({
  group,
  fields,
  formState,
  onFieldChange,
  disabled,
  readonly,
  collapsible = false,
  layout = "vertical",
  columns = 2,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(
    group.defaultExpanded ?? true
  );

  const groupFields = fields.filter((field) => field.groupId === group.id);

  if (groupFields.length === 0) return null;

  const gridClass =
    layout === "grid"
      ? `grid grid-cols-1 md:grid-cols-${columns} gap-4`
      : "space-y-4";

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader
        className={cn(
          "pb-3",
          collapsible && "cursor-pointer hover:bg-gray-800/50"
        )}
        onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}>
        <CardTitle className="text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            {group.label}
            {group.description && (
              <span className="text-sm text-gray-400 font-normal">
                - {group.description}
              </span>
            )}
          </span>
          {collapsible &&
            (isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            ))}
        </CardTitle>
      </CardHeader>

      {(!collapsible || isExpanded) && (
        <CardContent className={gridClass}>
          {groupFields.map((field) => (
            <DynamicField
              key={field.key}
              config={field}
              value={formState.values[field.key]}
              onChange={(value) => onFieldChange(field.key, value)}
              error={formState.errors[field.key]}
              warning={formState.warnings[field.key]}
              disabled={disabled}
              readonly={readonly}
              data-testid={`field-${field.key}`}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
};

/**
 * Main Dynamic Form Component
 */
export const DynamicForm: React.FC<DynamicFormProps> = ({
  categoryId,
  initialValues = {},
  onFieldChange,
  onValidationChange,
  onSubmit,
  disabled = false,
  readonly = false,
  className,

  // Form generation options
  includeOptionalFields = true,
  groupFields = true,
  enableConditionalLogic = true,
  customFieldOrder,
  excludeFields,
  fieldOverrides,

  // UI options
  showGroupHeaders = true,
  collapsibleGroups = false,
  showSubmitButton = true,
  submitButtonText = "Submit",
  showResetButton = false,
  resetButtonText = "Reset",

  // Layout options
  layout = "vertical",
  columns = 2,

  // Form wrapper options
  renderAsForm = true,
}) => {
  const formGenerator = useDynamicFormGenerator();

  // Form state
  const [formState, setFormState] = React.useState<FormState | null>(null);
  const [fields, setFields] = React.useState<SpecificationFieldConfig[]>([]);
  const [groups, setGroups] = React.useState<FieldGroup[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Memoize form generation options to prevent unnecessary re-renders
  const formOptions = React.useMemo(
    () => ({
      categoryId,
      includeOptionalFields,
      groupFields,
      enableConditionalLogic,
      customFieldOrder: customFieldOrder || undefined,
      excludeFields: excludeFields || undefined,
      fieldOverrides: fieldOverrides || undefined,
    }),
    [
      categoryId,
      includeOptionalFields,
      groupFields,
      enableConditionalLogic,
      customFieldOrder,
      excludeFields,
      fieldOverrides,
    ]
  );

  // Generate form on mount and when options change
  React.useEffect(() => {
    const generateForm = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const generatedForm = await formGenerator.generateForm(formOptions);
        const initialFormState = formGenerator.createInitialFormState(
          generatedForm.fields,
          initialValues
        );

        setFields(generatedForm.fields);
        setGroups(generatedForm.groups);
        setFormState(initialFormState);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate form"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (categoryId) {
      generateForm();
    }
  }, [formOptions, formGenerator]);

  // Update form state when initial values change (but not on first render)
  const isFirstRender = React.useRef(true);
  const prevInitialValues = React.useRef(initialValues);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevInitialValues.current = initialValues;
      return;
    }

    // Only update if initial values actually changed
    if (
      formState &&
      fields.length > 0 &&
      JSON.stringify(prevInitialValues.current) !==
        JSON.stringify(initialValues)
    ) {
      const updatedFormState = formGenerator.createInitialFormState(
        fields,
        initialValues
      );
      setFormState(updatedFormState);
      prevInitialValues.current = initialValues;
    }
  }, [initialValues, formState, fields, formGenerator]);

  // Handle field changes
  const handleFieldChange = React.useCallback(
    (fieldKey: string, value: any) => {
      if (!formState) return;

      const newFormState = formGenerator.handleFieldChange(
        formState,
        fieldKey,
        value,
        fields
      );
      setFormState(newFormState);

      // Notify parent component
      if (onFieldChange) {
        onFieldChange(fieldKey, value, newFormState.values);
      }

      // Notify validation changes
      if (onValidationChange) {
        onValidationChange(newFormState.isValid, newFormState.errors);
      }
    },
    [formState, fields, formGenerator, onFieldChange, onValidationChange]
  );

  // Handle form submission
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formState || !onSubmit) return;

      // Validate form before submission
      const validationResult = formGenerator.validateFormState(
        formState,
        fields,
        categoryId
      );

      if (!validationResult.isValid) {
        // Update form state with validation errors
        const updatedFormState = formGenerator.updateFormState(formState, {
          errors: Object.fromEntries(
            Object.entries(validationResult.fieldResults).map(
              ([key, result]) => [key, result.errors]
            )
          ),
          warnings: Object.fromEntries(
            Object.entries(validationResult.fieldResults).map(
              ([key, result]) => [key, result.warnings]
            )
          ),
          isValid: false,
        });
        setFormState(updatedFormState);
        return;
      }

      // Mark as submitting
      setFormState((prev) =>
        prev
          ? formGenerator.updateFormState(prev, { isSubmitting: true })
          : prev
      );

      try {
        await onSubmit(formState.values);
      } finally {
        // Reset submitting state
        setFormState((prev) =>
          prev
            ? formGenerator.updateFormState(prev, { isSubmitting: false })
            : prev
        );
      }
    },
    [formState, fields, categoryId, formGenerator, onSubmit]
  );

  // Handle form reset
  const handleReset = React.useCallback(() => {
    if (!fields.length) return;

    const resetFormState = formGenerator.createInitialFormState(fields, {});
    setFormState(resetFormState);
  }, [fields, formGenerator]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner text="Loading form..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-400">Failed to load form: {error}</p>
      </div>
    );
  }

  // No form state
  if (!formState) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
        <p className="text-yellow-400">Form not ready</p>
      </div>
    );
  }

  // Group fields by group
  const fieldsWithoutGroup = fields.filter((field) => !field.groupId);
  const groupedFields = groups
    .map((group) => ({
      group,
      fields: fields.filter((field) => field.groupId === group.id),
    }))
    .filter(({ fields }) => fields.length > 0);

  const gridClass =
    layout === "grid"
      ? `grid grid-cols-1 md:grid-cols-${columns} gap-4`
      : "space-y-4";

  const FormWrapper = renderAsForm ? "form" : "div";
  const formProps = renderAsForm ? { onSubmit: handleSubmit } : {};

  return (
    <FormWrapper {...formProps} className={cn("space-y-6", className)}>
      {/* Grouped Fields */}
      {groupFields &&
        showGroupHeaders &&
        groupedFields.map(({ group, fields: groupFields }) => (
          <FieldGroupComponent
            key={group.id}
            group={group}
            fields={groupFields}
            formState={formState}
            onFieldChange={handleFieldChange}
            disabled={disabled}
            readonly={readonly}
            collapsible={collapsibleGroups}
            layout={layout}
            columns={columns}
          />
        ))}

      {/* Ungrouped Fields */}
      {fieldsWithoutGroup.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className={cn("pt-6", gridClass)}>
            {fieldsWithoutGroup.map((field) => (
              <DynamicField
                key={field.key}
                config={field}
                value={formState.values[field.key]}
                onChange={(value) => handleFieldChange(field.key, value)}
                error={formState.errors[field.key]}
                warning={formState.warnings[field.key]}
                disabled={disabled}
                readonly={readonly}
                data-testid={`field-${field.key}`}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Form Actions */}
      {renderAsForm && (showSubmitButton || showResetButton) && (
        <div className="flex gap-4 justify-end">
          {showResetButton && (
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={disabled || formState.isSubmitting}>
              {resetButtonText}
            </Button>
          )}

          {showSubmitButton && (
            <Button
              type="submit"
              disabled={
                disabled || !formState.isValid || formState.isSubmitting
              }
              className="bg-blue-600 hover:bg-blue-700">
              {formState.isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </div>
              ) : (
                submitButtonText
              )}
            </Button>
          )}
        </div>
      )}
    </FormWrapper>
  );
};

/**
 * Hook for using dynamic form with more control
 */
export const useDynamicForm = (
  categoryId: string,
  options: Partial<FormGenerationOptions> = {}
) => {
  const formGenerator = useDynamicFormGenerator();
  const [formState, setFormState] = React.useState<FormState | null>(null);
  const [fields, setFields] = React.useState<SpecificationFieldConfig[]>([]);
  const [groups, setGroups] = React.useState<FieldGroup[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Initialize form
  React.useEffect(() => {
    const initializeForm = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const generatedForm = await formGenerator.generateForm({
          categoryId,
          includeOptionalFields: true,
          groupFields: true,
          enableConditionalLogic: true,
          ...options,
        });

        const initialFormState = formGenerator.createInitialFormState(
          generatedForm.fields
        );

        setFields(generatedForm.fields);
        setGroups(generatedForm.groups);
        setFormState(initialFormState);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize form"
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeForm();
  }, [categoryId, formGenerator]);

  const handleFieldChange = React.useCallback(
    (fieldKey: string, value: any) => {
      if (!formState) return;

      const newFormState = formGenerator.handleFieldChange(
        formState,
        fieldKey,
        value,
        fields
      );
      setFormState(newFormState);

      return newFormState;
    },
    [formState, fields, formGenerator]
  );

  const validateForm = React.useCallback(() => {
    if (!formState) return null;

    return formGenerator.validateFormState(formState, fields, categoryId);
  }, [formState, fields, categoryId, formGenerator]);

  const resetForm = React.useCallback(
    (newValues: Record<string, unknown> = {}) => {
      const resetFormState = formGenerator.createInitialFormState(
        fields,
        newValues
      );
      setFormState(resetFormState);
    },
    [fields, formGenerator]
  );

  return {
    formState,
    fields,
    groups,
    isLoading,
    error,
    handleFieldChange,
    validateForm,
    resetForm,
    setFormState,
  };
};
