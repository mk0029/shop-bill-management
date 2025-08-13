/**
 * UI Component Factory
 * Creates appropriate UI components for each field type with memoization
 */

import React from "react";
import {
  SpecificationFieldConfig,
  FieldComponentProps,
  FieldType,
} from "@/types/specification-field";
import { FieldConfigurationError } from "@/lib/specification-errors";

// Import field components
import { TextInput } from "./text-input";
import { NumberInput } from "./number-input";
import { SelectInput } from "./select-input";
import { MultiSelectInput } from "./multiselect-input";
import { BooleanInput } from "./boolean-input";
import { TextareaInput } from "./textarea-input";

// Additional field components
const EmailInput: React.FC<FieldComponentProps> = (props) => (
  <TextInput {...props} />
);

const UrlInput: React.FC<FieldComponentProps> = (props) => (
  <TextInput {...props} />
);

const DateInput: React.FC<FieldComponentProps> = (props) => {
  return (
    <TextInput
      {...props}
      // Override to use date input type
      className="[&>div>input]:type-date"
    />
  );
};

const RangeInput: React.FC<FieldComponentProps> = (props) => {
  const { config, value, onChange, disabled, readonly, className } = props;

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const min = config.validation?.min ?? 0;
  const max = config.validation?.max ?? 100;
  const step = config.formatting?.decimalPlaces
    ? Math.pow(10, -config.formatting.decimalPlaces)
    : 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-4">
        <input
          type="range"
          value={value || min}
          onChange={handleRangeChange}
          disabled={disabled || readonly}
          min={min}
          max={max}
          step={step}
          className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <span className="text-sm text-gray-300 min-w-[3rem] text-right">
          {value ?? min}
          {config.formatting?.suffix || ""}
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>
          {min}
          {config.formatting?.suffix || ""}
        </span>
        <span>
          {max}
          {config.formatting?.suffix || ""}
        </span>
      </div>
    </div>
  );
};

// Fallback component for unknown field types
const FallbackInput: React.FC<FieldComponentProps> = (props) => {
  console.warn(
    `Unknown field type: ${props.config.type}. Falling back to text input.`
  );
  return <TextInput {...props} />;
};

/**
 * Component type mapping
 */
type FieldComponent = React.ComponentType<FieldComponentProps>;

const COMPONENT_MAP: Record<FieldType, FieldComponent> = {
  text: TextInput,
  number: NumberInput,
  select: SelectInput,
  multiselect: MultiSelectInput,
  boolean: BooleanInput,
  textarea: TextareaInput,
  email: EmailInput,
  url: UrlInput,
  date: DateInput,
  range: RangeInput,
};

/**
 * UI Component Factory Class
 */
export class UIComponentFactory {
  private componentMap: Map<FieldType, FieldComponent> = new Map();
  private memoizedComponents: Map<
    string,
    React.ComponentType<FieldComponentProps>
  > = new Map();

  constructor() {
    this.initializeDefaultComponents();
  }

  /**
   * Initialize default component mappings
   */
  private initializeDefaultComponents(): void {
    Object.entries(COMPONENT_MAP).forEach(([type, component]) => {
      this.componentMap.set(type as FieldType, component);
    });
  }

  /**
   * Register a custom component for a field type
   */
  registerComponent(type: FieldType, component: FieldComponent): void {
    this.componentMap.set(type, component);
    // Clear memoized components for this type
    this.clearMemoizedComponentsForType(type);
  }

  /**
   * Create a component for the given field configuration
   */
  createComponent(
    config: SpecificationFieldConfig,
    props: Omit<FieldComponentProps, "config">
  ): React.ReactElement {
    const Component = this.getComponent(config.type);
    const fullProps: FieldComponentProps = { ...props, config };

    return React.createElement(Component, fullProps);
  }

  /**
   * Get component class for field type
   */
  getComponent(type: FieldType): FieldComponent {
    const component = this.componentMap.get(type);

    if (!component) {
      console.warn(
        `No component registered for field type: ${type}. Using fallback.`
      );
      return FallbackInput;
    }

    return component;
  }

  /**
   * Create memoized component for better performance
   */
  createMemoizedComponent(
    config: SpecificationFieldConfig
  ): React.ComponentType<Omit<FieldComponentProps, "config">> {
    const cacheKey = this.generateCacheKey(config);

    // Check if we already have a memoized component
    const cached = this.memoizedComponents.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Create new memoized component
    const BaseComponent = this.getComponent(config.type);

    const MemoizedComponent = React.memo<Omit<FieldComponentProps, "config">>(
      (props) => React.createElement(BaseComponent, { ...props, config }),
      (prevProps, nextProps) => {
        // Custom comparison for better memoization
        return (
          prevProps.value === nextProps.value &&
          prevProps.disabled === nextProps.disabled &&
          prevProps.readonly === nextProps.readonly &&
          JSON.stringify(prevProps.error) === JSON.stringify(nextProps.error) &&
          JSON.stringify(prevProps.warning) ===
            JSON.stringify(nextProps.warning)
        );
      }
    );

    MemoizedComponent.displayName = `Memoized${config.type}Field_${config.key}`;

    // Cache the memoized component
    this.memoizedComponents.set(cacheKey, MemoizedComponent);

    return MemoizedComponent;
  }

  /**
   * Validate field configuration before creating component
   */
  validateFieldConfiguration(config: SpecificationFieldConfig): void {
    if (!config.type) {
      throw new FieldConfigurationError(
        config.key,
        "MISSING_REQUIRED_PROPERTY",
        "Field type is required"
      );
    }

    if (!this.componentMap.has(config.type)) {
      throw new FieldConfigurationError(
        config.key,
        "INVALID_TYPE",
        `Unsupported field type: ${config.type}`
      );
    }

    // Validate select/multiselect fields have options
    if (["select", "multiselect"].includes(config.type)) {
      if (!config.options || config.options.length === 0) {
        throw new FieldConfigurationError(
          config.key,
          "MISSING_OPTIONS",
          `Field type '${config.type}' requires options to be defined`
        );
      }
    }

    // Validate number fields have proper validation rules
    if (["number", "range"].includes(config.type)) {
      if (
        config.validation?.min !== undefined &&
        config.validation?.max !== undefined
      ) {
        if (config.validation.min >= config.validation.max) {
          throw new FieldConfigurationError(
            config.key,
            "VALIDATION_ERROR",
            "Minimum value must be less than maximum value"
          );
        }
      }
    }
  }

  /**
   * Get all registered field types
   */
  getRegisteredTypes(): FieldType[] {
    return Array.from(this.componentMap.keys());
  }

  /**
   * Check if a field type is supported
   */
  isTypeSupported(type: FieldType): boolean {
    return this.componentMap.has(type);
  }

  /**
   * Clear all memoized components
   */
  clearMemoizedComponents(): void {
    this.memoizedComponents.clear();
  }

  /**
   * Clear memoized components for a specific type
   */
  private clearMemoizedComponentsForType(type: FieldType): void {
    const keysToDelete = Array.from(this.memoizedComponents.keys()).filter(
      (key) => key.includes(`_${type}_`)
    );

    keysToDelete.forEach((key) => {
      this.memoizedComponents.delete(key);
    });
  }

  /**
   * Generate cache key for memoization
   */
  private generateCacheKey(config: SpecificationFieldConfig): string {
    return `${config.id}_${config.type}_${config.version || 1}`;
  }

  /**
   * Get factory statistics
   */
  getStatistics() {
    return {
      registeredTypes: this.componentMap.size,
      memoizedComponents: this.memoizedComponents.size,
      supportedTypes: this.getRegisteredTypes(),
    };
  }
}

// Singleton instance
let factoryInstance: UIComponentFactory | null = null;

/**
 * Get the singleton factory instance
 */
export const getUIComponentFactory = (): UIComponentFactory => {
  if (!factoryInstance) {
    factoryInstance = new UIComponentFactory();
  }
  return factoryInstance;
};

/**
 * React hook for using the UI component factory
 */
export const useUIComponentFactory = () => {
  const factory = getUIComponentFactory();

  return {
    createComponent: (
      config: SpecificationFieldConfig,
      props: Omit<FieldComponentProps, "config">
    ) => factory.createComponent(config, props),
    createMemoizedComponent: (config: SpecificationFieldConfig) =>
      factory.createMemoizedComponent(config),
    getComponent: (type: FieldType) => factory.getComponent(type),
    registerComponent: (type: FieldType, component: FieldComponent) =>
      factory.registerComponent(type, component),
    validateFieldConfiguration: (config: SpecificationFieldConfig) =>
      factory.validateFieldConfiguration(config),
    isTypeSupported: (type: FieldType) => factory.isTypeSupported(type),
    getRegisteredTypes: () => factory.getRegisteredTypes(),
    clearMemoizedComponents: () => factory.clearMemoizedComponents(),
    getStatistics: () => factory.getStatistics(),
  };
};

/**
 * Dynamic Field Component
 * Main component that uses the factory to render the appropriate field type
 */
export interface DynamicFieldProps extends Omit<FieldComponentProps, "config"> {
  config: SpecificationFieldConfig;
  useMemoization?: boolean;
}

export const DynamicField: React.FC<DynamicFieldProps> = ({
  config,
  useMemoization = true,
  ...props
}) => {
  const factory = getUIComponentFactory();

  // Validate configuration
  React.useEffect(() => {
    try {
      factory.validateFieldConfiguration(config);
    } catch (error) {
      console.error("Field configuration validation failed:", error);
    }
  }, [config, factory]);

  // Create component
  const component = React.useMemo(() => {
    if (useMemoization) {
      const MemoizedComponent = factory.createMemoizedComponent(config);
      return <MemoizedComponent {...props} />;
    } else {
      return factory.createComponent(config, props);
    }
  }, [config, props, useMemoization, factory]);

  return component;
};

// Export individual field components for direct use
export {
  TextInput,
  NumberInput,
  SelectInput,
  MultiSelectInput,
  BooleanInput,
  TextareaInput,
  EmailInput,
  UrlInput,
  DateInput,
  RangeInput,
  FallbackInput,
};
