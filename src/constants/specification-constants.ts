/**
 * Dynamic Specification System Constants
 * Central constants and configuration values
 */

import {
  FieldType,
  CategoryType,
  SpecificationFieldConfig,
} from "@/types/specification-field";

// Field Type Constants
export const FIELD_TYPES: Record<string, FieldType> = {
  TEXT: "text",
  NUMBER: "number",
  SELECT: "select",
  MULTISELECT: "multiselect",
  BOOLEAN: "boolean",
  TEXTAREA: "textarea",
  EMAIL: "email",
  URL: "url",
  DATE: "date",
  RANGE: "range",
} as const;

// Category Type Constants
export const CATEGORY_TYPES: Record<string, CategoryType> = {
  AMPERE: "ampere",
  VOLT_WATT: "volt-watt",
  WIRE: "wire",
  LIGHT: "light",
  GENERAL: "general",
} as const;

// Common Field Keys (standardized across the system)
export const COMMON_FIELD_KEYS = {
  // Electrical
  WATTS: "watts",
  VOLTAGE: "voltage",
  AMPERAGE: "amperage",
  FREQUENCY: "frequency",
  PHASE: "phase",

  // Physical
  COLOR: "color",
  SIZE: "size",
  MATERIAL: "material",
  WEIGHT: "weight",
  DIMENSIONS: "dimensions",

  // Wire Specific
  WIRE_GAUGE: "wireGauge",
  CORE: "core",
  INSULATION: "insulation",

  // Lighting Specific
  LIGHT_TYPE: "lightType",
  LUMENS: "lumens",
  COLOR_TEMP: "colorTemp",
  BEAM_ANGLE: "beamAngle",

  // Switch/Socket Specific
  SWITCH_TYPE: "switchType",
  POLES: "poles",
  MOUNTING: "mounting",

  // Motor Specific
  HORSEPOWER: "horsepower",
  RPM: "rpm",
} as const;

// Validation Constants
export const VALIDATION_LIMITS = {
  // Text fields
  MAX_TEXT_LENGTH: 255,
  MAX_TEXTAREA_LENGTH: 1000,

  // Number fields
  MIN_WATTS: 0.1,
  MAX_WATTS: 2000,
  MIN_VOLTAGE: 1,
  MAX_VOLTAGE: 1000,
  MIN_AMPERAGE: 0.1,
  MAX_AMPERAGE: 1000,
  MIN_WIRE_GAUGE: 0.1,
  MAX_WIRE_GAUGE: 50,
  MIN_LUMENS: 1,
  MAX_LUMENS: 50000,
  MIN_RPM: 1,
  MAX_RPM: 10000,

  // System limits
  MAX_FIELDS_PER_CATEGORY: 100,
  MAX_CONDITIONAL_DEPTH: 5,
  MAX_OPTIONS_PER_FIELD: 1000,
} as const;

// Performance Constants
export const PERFORMANCE_THRESHOLDS = {
  FIELD_LOAD_TIME: 500, // ms
  VALIDATION_TIME: 100, // ms per field
  FORM_RENDER_TIME: 1000, // ms
  CATEGORY_CHANGE_TIME: 200, // ms
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  MAX_MEMORY_USAGE: 100, // MB
} as const;

// Common Field Options
export const COMMON_OPTIONS = {
  VOLTAGE: [
    { value: "12V", label: "12V" },
    { value: "24V", label: "24V" },
    { value: "110V", label: "110V" },
    { value: "220V", label: "220V" },
    { value: "240V", label: "240V" },
    { value: "415V", label: "415V" },
  ],

  AMPERAGE: [
    { value: "6A", label: "6A" },
    { value: "10A", label: "10A" },
    { value: "16A", label: "16A" },
    { value: "20A", label: "20A" },
    { value: "25A", label: "25A" },
    { value: "32A", label: "32A" },
    { value: "40A", label: "40A" },
    { value: "63A", label: "63A" },
  ],

  WIRE_GAUGE: [
    { value: "0.5", label: "0.5 sq mm" },
    { value: "0.75", label: "0.75 sq mm" },
    { value: "1.0", label: "1.0 sq mm" },
    { value: "1.5", label: "1.5 sq mm" },
    { value: "2.5", label: "2.5 sq mm" },
    { value: "4.0", label: "4.0 sq mm" },
    { value: "6.0", label: "6.0 sq mm" },
    { value: "10.0", label: "10.0 sq mm" },
    { value: "16.0", label: "16.0 sq mm" },
  ],

  CORE_TYPE: [
    { value: "single", label: "Single Core" },
    { value: "multi", label: "Multi Core" },
    { value: "stranded", label: "Stranded" },
  ],

  INSULATION: [
    { value: "PVC", label: "PVC" },
    { value: "XLPE", label: "XLPE" },
    { value: "rubber", label: "Rubber" },
  ],

  LIGHT_TYPE: [
    { value: "led", label: "LED" },
    { value: "cfl", label: "CFL" },
    { value: "incandescent", label: "Incandescent" },
    { value: "halogen", label: "Halogen" },
    { value: "fluorescent", label: "Fluorescent" },
  ],

  COLOR_TEMP: [
    { value: "warm-white", label: "Warm White (2700K)" },
    { value: "cool-white", label: "Cool White (4000K)" },
    { value: "daylight", label: "Daylight (6500K)" },
  ],

  COLORS: [
    { value: "white", label: "White" },
    { value: "black", label: "Black" },
    { value: "red", label: "Red" },
    { value: "blue", label: "Blue" },
    { value: "green", label: "Green" },
    { value: "yellow", label: "Yellow" },
    { value: "brown", label: "Brown" },
    { value: "grey", label: "Grey" },
  ],

  SWITCH_TYPE: [
    { value: "toggle", label: "Toggle" },
    { value: "rocker", label: "Rocker" },
    { value: "push-button", label: "Push Button" },
    { value: "rotary", label: "Rotary" },
  ],

  POLES: [
    { value: "1-pole", label: "1 Pole" },
    { value: "2-pole", label: "2 Pole" },
    { value: "3-pole", label: "3 Pole" },
    { value: "4-pole", label: "4 Pole" },
  ],

  MOUNTING: [
    { value: "surface", label: "Surface Mount" },
    { value: "flush", label: "Flush Mount" },
    { value: "panel", label: "Panel Mount" },
    { value: "din-rail", label: "DIN Rail" },
  ],

  PHASE: [
    { value: "single", label: "Single Phase" },
    { value: "three", label: "Three Phase" },
  ],

  FREQUENCY: [
    { value: "50Hz", label: "50 Hz" },
    { value: "60Hz", label: "60 Hz" },
  ],

  MATERIAL: [
    { value: "plastic", label: "Plastic" },
    { value: "metal", label: "Metal" },
    { value: "ceramic", label: "Ceramic" },
    { value: "glass", label: "Glass" },
    { value: "rubber", label: "Rubber" },
    { value: "copper", label: "Copper" },
    { value: "aluminum", label: "Aluminum" },
    { value: "steel", label: "Steel" },
  ],
} as const;

// Predefined Field Configurations for Common Fields
export const PREDEFINED_FIELDS: Record<
  string,
  Partial<SpecificationFieldConfig>
> = {
  [COMMON_FIELD_KEYS.WATTS]: {
    key: COMMON_FIELD_KEYS.WATTS,
    label: "Watts",
    type: FIELD_TYPES.NUMBER,
    validation: {
      min: VALIDATION_LIMITS.MIN_WATTS,
      max: VALIDATION_LIMITS.MAX_WATTS,
      errorMessage: `Watts must be between ${VALIDATION_LIMITS.MIN_WATTS}W and ${VALIDATION_LIMITS.MAX_WATTS}W`,
    },
    formatting: {
      suffix: "W",
      decimalPlaces: 1,
    },
    placeholder: "Enter watts (e.g., 9, 100, 500)",
    description: "Power consumption in watts",
    searchable: true,
    sortable: true,
    exportable: true,
  },

  [COMMON_FIELD_KEYS.VOLTAGE]: {
    key: COMMON_FIELD_KEYS.VOLTAGE,
    label: "Voltage",
    type: FIELD_TYPES.SELECT,
    options: COMMON_OPTIONS.VOLTAGE,
    placeholder: "Select voltage",
    description: "Operating voltage",
    searchable: true,
    sortable: true,
    exportable: true,
  },

  [COMMON_FIELD_KEYS.AMPERAGE]: {
    key: COMMON_FIELD_KEYS.AMPERAGE,
    label: "Amperage",
    type: FIELD_TYPES.SELECT,
    options: COMMON_OPTIONS.AMPERAGE,
    placeholder: "Select amperage",
    description: "Current rating in amperes",
    searchable: true,
    sortable: true,
    exportable: true,
  },

  [COMMON_FIELD_KEYS.COLOR]: {
    key: COMMON_FIELD_KEYS.COLOR,
    label: "Color",
    type: FIELD_TYPES.SELECT,
    options: COMMON_OPTIONS.COLORS,
    placeholder: "Select color",
    description: "Product color",
    searchable: true,
    sortable: true,
    exportable: true,
  },

  [COMMON_FIELD_KEYS.WIRE_GAUGE]: {
    key: COMMON_FIELD_KEYS.WIRE_GAUGE,
    label: "Wire Gauge",
    type: FIELD_TYPES.SELECT,
    options: COMMON_OPTIONS.WIRE_GAUGE,
    placeholder: "Select wire gauge",
    description: "Wire thickness in square millimeters",
    searchable: true,
    sortable: true,
    exportable: true,
  },

  [COMMON_FIELD_KEYS.LIGHT_TYPE]: {
    key: COMMON_FIELD_KEYS.LIGHT_TYPE,
    label: "Light Type",
    type: FIELD_TYPES.SELECT,
    options: COMMON_OPTIONS.LIGHT_TYPE,
    placeholder: "Select light type",
    description: "Type of lighting technology",
    searchable: true,
    sortable: true,
    exportable: true,
  },
};

// Category Field Mappings
export const CATEGORY_FIELD_MAPPINGS = {
  [CATEGORY_TYPES.AMPERE]: {
    requiredFields: [COMMON_FIELD_KEYS.AMPERAGE, COMMON_FIELD_KEYS.VOLTAGE],
    commonFields: [
      COMMON_FIELD_KEYS.POLES,
      COMMON_FIELD_KEYS.SWITCH_TYPE,
      COMMON_FIELD_KEYS.MOUNTING,
    ],
  },

  [CATEGORY_TYPES.VOLT_WATT]: {
    requiredFields: [COMMON_FIELD_KEYS.VOLTAGE, COMMON_FIELD_KEYS.WATTS],
    commonFields: [
      COMMON_FIELD_KEYS.FREQUENCY,
      COMMON_FIELD_KEYS.PHASE,
      COMMON_FIELD_KEYS.HORSEPOWER,
    ],
  },

  [CATEGORY_TYPES.WIRE]: {
    requiredFields: [COMMON_FIELD_KEYS.WIRE_GAUGE, COMMON_FIELD_KEYS.CORE],
    commonFields: [
      COMMON_FIELD_KEYS.INSULATION,
      COMMON_FIELD_KEYS.VOLTAGE,
      COMMON_FIELD_KEYS.MATERIAL,
    ],
  },

  [CATEGORY_TYPES.LIGHT]: {
    requiredFields: [COMMON_FIELD_KEYS.WATTS, COMMON_FIELD_KEYS.LIGHT_TYPE],
    commonFields: [
      COMMON_FIELD_KEYS.LUMENS,
      COMMON_FIELD_KEYS.COLOR_TEMP,
      COMMON_FIELD_KEYS.VOLTAGE,
      COMMON_FIELD_KEYS.COLOR,
    ],
  },

  [CATEGORY_TYPES.GENERAL]: {
    requiredFields: [],
    commonFields: [
      COMMON_FIELD_KEYS.COLOR,
      COMMON_FIELD_KEYS.SIZE,
      COMMON_FIELD_KEYS.MATERIAL,
      COMMON_FIELD_KEYS.WEIGHT,
      COMMON_FIELD_KEYS.DIMENSIONS,
    ],
  },
} as const;

// Event Names for Registry
export const REGISTRY_EVENTS = {
  FIELD_ADDED: "field_added",
  FIELD_UPDATED: "field_updated",
  FIELD_REMOVED: "field_removed",
  FIELD_ACTIVATED: "field_activated",
  FIELD_DEACTIVATED: "field_deactivated",
  CATEGORY_MAPPING_CHANGED: "category_mapping_changed",
  CACHE_UPDATED: "cache_updated",
  VALIDATION_RULES_CHANGED: "validation_rules_changed",
} as const;

// Cache Keys
export const CACHE_KEYS = {
  FIELD_CONFIGS: "specification_field_configs",
  CATEGORY_MAPPINGS: "category_field_mappings",
  VALIDATION_RULES: "field_validation_rules",
  FIELD_OPTIONS: "field_options",
  FORM_SCHEMAS: "form_schemas",
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  FIELDS: "/api/specification-fields",
  CATEGORIES: "/api/categories",
  FIELD_OPTIONS: "/api/specification-fields/options",
  VALIDATION: "/api/specification-fields/validate",
  SCHEMA: "/api/specification-fields/schema",
} as const;

// Default Registry Configuration
export const DEFAULT_REGISTRY_CONFIG = {
  cacheTimeout: PERFORMANCE_THRESHOLDS.CACHE_TTL,
  enableRealTimeUpdates: true,
  validateOnLoad: true,
  enablePerformanceMetrics: process.env.NODE_ENV === "development",
  maxFieldsPerCategory: VALIDATION_LIMITS.MAX_FIELDS_PER_CATEGORY,
  maxConditionalDepth: VALIDATION_LIMITS.MAX_CONDITIONAL_DEPTH,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  FIELD_NOT_FOUND: "Specification field not found",
  INVALID_FIELD_TYPE: "Invalid field type specified",
  VALIDATION_FAILED: "Field validation failed",
  REQUIRED_FIELD_MISSING: "Required field is missing",
  CIRCULAR_DEPENDENCY: "Circular dependency detected in conditional rules",
  CACHE_ERROR: "Cache operation failed",
  NETWORK_ERROR: "Network error occurred while loading field configurations",
  PERMISSION_DENIED: "Permission denied for field configuration operation",
} as const;
