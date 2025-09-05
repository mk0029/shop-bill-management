/**
 * Base Field Component
 * Abstract base class for all dynamic specification field components
 */

import React from "react";
import {
  SpecificationFieldConfig,
  FieldComponentProps,
} from "@/types/specification-field";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/**
 * Base Field Component Props
 */
export interface BaseFieldProps extends FieldComponentProps {
  className?: string;
  showLabel?: boolean;
  showDescription?: boolean;
  showHelpText?: boolean;
  labelClassName?: string;
  errorClassName?: string;
  warningClassName?: string;
}

/**
 * Abstract Base Field Component
 */
export abstract class BaseFieldComponent<
  T = any,
> extends React.Component<BaseFieldProps> {
  protected fieldId: string;

  constructor(props: BaseFieldProps) {
    super(props);
    this.fieldId = `field-${props.config.key}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Abstract method to render the input element
   */
  protected abstract renderInput(): React.ReactNode;

  /**
   * Handle value change
   */
  protected handleChange = (value: T): void => {
    const { onChange, config } = this.props;

    // Apply formatting if specified
    const formattedValue = this.formatValue(value);

    onChange(formattedValue);
  };

  /**
   * Handle blur event
   */
  protected handleBlur = (): void => {
    const { onBlur } = this.props;
    if (onBlur) {
      onBlur();
    }
  };

  /**
   * Handle focus event
   */
  protected handleFocus = (): void => {
    const { onFocus } = this.props;
    if (onFocus) {
      onFocus();
    }
  };

  /**
   * Format value based on field configuration
   */
  protected formatValue(value: T): T {
    const { config } = this.props;

    if (!config.formatting || value === null || value === undefined) {
      return value;
    }

    // Apply text transformations for string values
    if (typeof value === "string" && config.formatting.transform) {
      switch (config.formatting.transform) {
        case "uppercase":
          return value.toUpperCase() as T;
        case "lowercase":
          return value.toLowerCase() as T;
        case "capitalize":
          return (value.charAt(0).toUpperCase() +
            value.slice(1).toLowerCase()) as T;
        default:
          return value;
      }
    }

    return value;
  }

  /**
   * Get display value with prefix/suffix
   */
  protected getDisplayValue(value: T): string {
    const { config } = this.props;

    if (value === null || value === undefined || value === "") {
      return "";
    }

    let displayValue = String(value);

    // Apply number formatting
    if (
      typeof value === "number" &&
      config.formatting?.decimalPlaces !== undefined
    ) {
      displayValue = value.toFixed(config.formatting.decimalPlaces);
    }

    // Add prefix and suffix
    if (config.formatting?.prefix) {
      displayValue = config.formatting.prefix + displayValue;
    }
    if (config.formatting?.suffix) {
      displayValue = displayValue + config.formatting.suffix;
    }

    return displayValue;
  }

  /**
   * Check if field has errors
   */
  protected hasErrors(): boolean {
    const { error } = this.props;
    return error && error.length > 0;
  }

  /**
   * Check if field has warnings
   */
  protected hasWarnings(): boolean {
    const { warning } = this.props;
    return warning && warning.length > 0;
  }

  /**
   * Get field state classes
   */
  protected getFieldStateClasses(): string {
    return cn({
      "border-red-500 focus:border-red-500": this.hasErrors(),
      "border-yellow-500 focus:border-yellow-500":
        this.hasWarnings() && !this.hasErrors(),
      "opacity-50 cursor-not-allowed": this.props.disabled,
    });
  }

  /**
   * Render field label
   */
  protected renderLabel(): React.ReactNode {
    const { config, required, showLabel = true, labelClassName } = this.props;

    if (!showLabel) return null;

    return (
      <Label
        htmlFor={this.fieldId}
        className={cn("text-gray-300 font-medium", labelClassName)}>
        {config.label}
        {(required || config.required) && (
          <span className="text-red-400 ml-1">*</span>
        )}
      </Label>
    );
  }

  /**
   * Render field description
   */
  protected renderDescription(): React.ReactNode {
    const { config, showDescription = true } = this.props;

    if (!showDescription || !config.description) return null;

    return <p className="text-sm text-gray-400 mt-1">{config.description}</p>;
  }

  /**
   * Render help text
   */
  protected renderHelpText(): React.ReactNode {
    const { config, showHelpText = true } = this.props;

    if (!showHelpText || !config.helpText) return null;

    return <p className="text-xs text-gray-500 mt-1">{config.helpText}</p>;
  }

  /**
   * Render error messages
   */
  protected renderErrors(): React.ReactNode {
    const { error, errorClassName } = this.props;

    if (!this.hasErrors()) return null;

    return (
      <div className={cn("mt-1", errorClassName)}>
        {error!.map((errorMsg, index) => (
          <p key={index} className="text-sm text-red-400">
            {errorMsg}
          </p>
        ))}
      </div>
    );
  }

  /**
   * Render warning messages
   */
  protected renderWarnings(): React.ReactNode {
    const { warning, warningClassName } = this.props;

    if (!this.hasWarnings()) return null;

    return (
      <div className={cn("mt-1", warningClassName)}>
        {warning!.map((warningMsg, index) => (
          <p key={index} className="text-sm text-yellow-400">
            ⚠️ {warningMsg}
          </p>
        ))}
      </div>
    );
  }

  /**
   * Main render method
   */
  render(): React.ReactNode {
    const { className } = this.props;

    return (
      <div className={cn("space-y-2", className)}>
        {this.renderLabel()}
        {this.renderInput()}
        {this.renderDescription()}
        {this.renderHelpText()}
        {this.renderErrors()}
        {this.renderWarnings()}
      </div>
    );
  }
}

/**
 * Functional Base Field Component Hook
 */
export const useBaseField = (props: BaseFieldProps) => {
  const fieldId = React.useMemo(
    () =>
      `field-${props.config.key}-${Math.random().toString(36).substr(2, 9)}`,
    [props.config.key]
  );

  const handleChange = React.useCallback(
    (value: any) => {
      const { onChange, config } = props;

      // Apply formatting if specified
      let formattedValue = value;

      if (config.formatting && typeof value === "string") {
        switch (config.formatting.transform) {
          case "uppercase":
            formattedValue = value.toUpperCase();
            break;
          case "lowercase":
            formattedValue = value.toLowerCase();
            break;
          case "capitalize":
            formattedValue =
              value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
            break;
        }
      }

      onChange(formattedValue);
    },
    [props.onChange, props.config.formatting]
  );

  const handleBlur = React.useCallback(() => {
    if (props.onBlur) {
      props.onBlur();
    }
  }, [props.onBlur]);

  const handleFocus = React.useCallback(() => {
    if (props.onFocus) {
      props.onFocus();
    }
  }, [props.onFocus]);

  const getDisplayValue = React.useCallback(
    (value: any): string => {
      const { config } = props;

      if (value === null || value === undefined || value === "") {
        return "";
      }

      let displayValue = String(value);

      // Apply number formatting
      if (
        typeof value === "number" &&
        config.formatting?.decimalPlaces !== undefined
      ) {
        displayValue = value.toFixed(config.formatting.decimalPlaces);
      }

      // Add prefix and suffix
      if (config.formatting?.prefix) {
        displayValue = config.formatting.prefix + displayValue;
      }
      if (config.formatting?.suffix) {
        displayValue = displayValue + config.formatting.suffix;
      }

      return displayValue;
    },
    [props.config.formatting]
  );

  const hasErrors = React.useMemo(() => {
    return props.error && props.error.length > 0;
  }, [props.error]);

  const hasWarnings = React.useMemo(() => {
    return props.warning && props.warning.length > 0;
  }, [props.warning]);

  const fieldStateClasses = React.useMemo(() => {
    return cn({
      "border-red-500 focus:border-red-500": hasErrors,
      "border-yellow-500 focus:border-yellow-500": hasWarnings && !hasErrors,
      "opacity-50 cursor-not-allowed": props.disabled,
    });
  }, [hasErrors, hasWarnings, props.disabled]);

  return {
    fieldId,
    handleChange,
    handleBlur,
    handleFocus,
    getDisplayValue,
    hasErrors,
    hasWarnings,
    fieldStateClasses,
  };
};

/**
 * Field Wrapper Component
 */
export interface FieldWrapperProps {
  config: SpecificationFieldConfig;
  error?: string[];
  warning?: string[];
  className?: string;
  showLabel?: boolean;
  showDescription?: boolean;
  showHelpText?: boolean;
  children: React.ReactNode;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  config,
  error,
  warning,
  className,
  showLabel = true,
  showDescription = true,
  showHelpText = true,
  children,
}) => {
  const fieldId = `field-${config.key}-${Math.random().toString(36).substr(2, 9)}`;
  const hasErrors = error && error.length > 0;
  const hasWarnings = warning && warning.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      {showLabel && (
        <Label htmlFor={fieldId} className="text-gray-300 font-medium">
          {config.label}
          {config.required && <span className="text-red-400 ml-1">*</span>}
        </Label>
      )}

      {/* Input */}
      <div className="relative">{children}</div>

      {/* Description */}
      {showDescription && config.description && (
        <p className="text-sm text-gray-400">{config.description}</p>
      )}

      {/* Help Text */}
      {showHelpText && config.helpText && (
        <p className="text-xs text-gray-500">{config.helpText}</p>
      )}

      {/* Errors */}
      {hasErrors && (
        <div className="mt-1">
          {error!.map((errorMsg, index) => (
            <p key={index} className="text-sm text-red-400">
              {errorMsg}
            </p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="mt-1">
          {warning!.map((warningMsg, index) => (
            <p key={index} className="text-sm text-yellow-400">
              ⚠️ {warningMsg}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
