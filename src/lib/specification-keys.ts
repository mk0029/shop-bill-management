/**
 * Specification Keys Helper
 * Provides utilities to get all available specification keys in the system
 */

export interface SpecificationKeyInfo {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "multiselect" | "boolean";
  category?: string[];
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  description?: string;
  examples?: string[];
}

/**
 * All available specification keys in the system
 */
export const SPECIFICATION_KEYS: SpecificationKeyInfo[] = [
  // Electrical Specifications
  {
    key: "voltage",
    label: "Voltage",
    type: "select",
    category: ["electrical", "motor", "light", "switch"],
    required: true,
    description: "Voltage rating of the electrical component",
    examples: ["12V", "24V", "110V", "220V", "240V", "415V"],
  },
  {
    key: "amperage",
    label: "Amperage",
    type: "select",
    category: ["switch", "mcb", "contactor"],
    required: true,
    description: "Current rating in amperes",
    examples: ["6A", "10A", "16A", "20A", "25A", "32A", "40A", "63A"],
  },
  {
    key: "watts",
    label: "Watts",
    type: "number",
    category: ["light", "motor", "pump"],
    required: true,
    validation: { min: 0.1, max: 2000 },
    description: "Power consumption in watts",
    examples: ["9", "100", "500", "1000"],
  },
  {
    key: "frequency",
    label: "Frequency",
    type: "select",
    category: ["motor", "electrical"],
    description: "Frequency rating",
    examples: ["50Hz", "60Hz"],
  },

  // Physical Specifications
  {
    key: "color",
    label: "Color",
    type: "select",
    category: ["light", "wire", "switch", "general"],
    description: "Color of the item",
    examples: ["white", "black", "red", "blue", "green", "yellow"],
  },
  {
    key: "size",
    label: "Size",
    type: "select",
    category: ["general", "light", "switch"],
    description: "Size specification",
    examples: ["small", "medium", "large", "2x4", "4x4"],
  },
  {
    key: "material",
    label: "Material",
    type: "select",
    category: ["general", "switch", "wire"],
    description: "Material type",
    examples: ["plastic", "metal", "ceramic", "glass", "rubber"],
  },
  {
    key: "weight",
    label: "Weight",
    type: "text",
    category: ["general"],
    description: "Weight specification",
    examples: ["1kg", "500g", "2.5kg"],
  },
  {
    key: "dimensions",
    label: "Dimensions",
    type: "text",
    category: ["general"],
    description: "Physical dimensions",
    examples: ["10x5x3cm", "15x10x5mm"],
  },

  // Wire Specifications
  {
    key: "wireGauge",
    label: "Wire Gauge",
    type: "select",
    category: ["wire"],
    required: true,
    description: "Wire gauge/thickness in sq mm",
    examples: [
      "0.5",
      "0.75",
      "1.0",
      "1.5",
      "2.5",
      "4.0",
      "6.0",
      "10.0",
      "16.0",
    ],
  },
  {
    key: "core",
    label: "Core Type",
    type: "select",
    category: ["wire"],
    required: true,
    description: "Core type of the wire",
    examples: ["single", "multi", "stranded"],
  },
  {
    key: "insulation",
    label: "Insulation",
    type: "select",
    category: ["wire"],
    description: "Insulation type",
    examples: ["PVC", "XLPE", "rubber"],
  },

  // Lighting Specifications
  {
    key: "lightType",
    label: "Light Type",
    type: "select",
    category: ["light"],
    required: true,
    description: "Type of light technology",
    examples: ["led", "cfl", "incandescent", "halogen", "fluorescent"],
  },
  {
    key: "lumens",
    label: "Lumens",
    type: "number",
    category: ["light"],
    validation: { min: 1, max: 50000 },
    description: "Light output in lumens",
    examples: ["800", "1200", "1600", "2400"],
  },
  {
    key: "colorTemp",
    label: "Color Temperature",
    type: "select",
    category: ["light"],
    description: "Color temperature of the light",
    examples: [
      "warm-white",
      "cool-white",
      "daylight",
      "2700K",
      "4000K",
      "6500K",
    ],
  },
  {
    key: "beamAngle",
    label: "Beam Angle",
    type: "select",
    category: ["light"],
    description: "Beam angle for directional lights",
    examples: ["30°", "60°", "90°", "120°"],
  },

  // Switch & Socket Specifications
  {
    key: "switchType",
    label: "Switch Type",
    type: "select",
    category: ["switch"],
    description: "Type of switch mechanism",
    examples: ["toggle", "rocker", "push-button", "rotary"],
  },
  {
    key: "poles",
    label: "Poles",
    type: "select",
    category: ["switch", "mcb"],
    description: "Number of poles",
    examples: ["1-pole", "2-pole", "3-pole", "4-pole"],
  },
  {
    key: "mounting",
    label: "Mounting Type",
    type: "select",
    category: ["switch", "mcb"],
    description: "Mounting type",
    examples: ["surface", "flush", "panel", "din-rail"],
  },

  // Motor Specifications
  {
    key: "horsepower",
    label: "Horsepower",
    type: "select",
    category: ["motor"],
    description: "Motor power in HP",
    examples: ["0.25HP", "0.5HP", "1HP", "2HP", "3HP", "5HP"],
  },
  {
    key: "rpm",
    label: "RPM",
    type: "select",
    category: ["motor"],
    description: "Revolutions per minute",
    examples: ["720", "1440", "2880", "3600"],
  },
  {
    key: "phase",
    label: "Phase",
    type: "select",
    category: ["motor", "electrical"],
    description: "Electrical phase",
    examples: ["single", "three"],
  },
];

/**
 * Get all specification keys
 */
export const getAllSpecificationKeys = (): string[] => {
  return SPECIFICATION_KEYS.map((spec) => spec.key);
};

/**
 * Get specification keys for a specific category
 */
export const getSpecificationKeysForCategory = (
  category: string
): SpecificationKeyInfo[] => {
  return SPECIFICATION_KEYS.filter(
    (spec) =>
      spec.category?.includes(category) || spec.category?.includes("general")
  );
};

/**
 * Get specification key info
 */
export const getSpecificationKeyInfo = (
  key: string
): SpecificationKeyInfo | undefined => {
  return SPECIFICATION_KEYS.find((spec) => spec.key === key);
};

/**
 * Get required specification keys for a category
 */
export const getRequiredKeysForCategory = (category: string): string[] => {
  return SPECIFICATION_KEYS.filter(
    (spec) => spec.required && spec.category?.includes(category)
  ).map((spec) => spec.key);
};

/**
 * Category type mappings
 */
export const CATEGORY_TYPES = {
  AMPERE: "ampere",
  VOLT_WATT: "volt-watt",
  WIRE: "wire",
  LIGHT: "light",
  GENERAL: "general",
} as const;

/**
 * Get category type for common categories
 */
export const getCategoryType = (categoryName: string): string => {
  const name = categoryName.toLowerCase();

  if (
    name.includes("switch") ||
    name.includes("mcb") ||
    name.includes("contactor")
  ) {
    return CATEGORY_TYPES.AMPERE;
  }

  if (
    name.includes("motor") ||
    name.includes("pump") ||
    name.includes("light")
  ) {
    return CATEGORY_TYPES.VOLT_WATT;
  }

  if (name.includes("wire") || name.includes("cable")) {
    return CATEGORY_TYPES.WIRE;
  }

  if (name.includes("led") || name.includes("bulb") || name.includes("lamp")) {
    return CATEGORY_TYPES.LIGHT;
  }

  return CATEGORY_TYPES.GENERAL;
};

/**
 * Validate specification value
 */
export const validateSpecificationValue = (
  key: string,
  value: any
): string[] => {
  const errors: string[] = [];
  const keyInfo = getSpecificationKeyInfo(key);

  if (!keyInfo) {
    return errors;
  }

  if (keyInfo.required && (!value || value.toString().trim() === "")) {
    errors.push(`${keyInfo.label} is required`);
    return errors;
  }

  if (keyInfo.type === "number" && value) {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      errors.push(`${keyInfo.label} must be a valid number`);
    } else if (keyInfo.validation) {
      if (
        keyInfo.validation.min !== undefined &&
        numValue < keyInfo.validation.min
      ) {
        errors.push(
          `${keyInfo.label} must be at least ${keyInfo.validation.min}`
        );
      }
      if (
        keyInfo.validation.max !== undefined &&
        numValue > keyInfo.validation.max
      ) {
        errors.push(`${keyInfo.label} cannot exceed ${keyInfo.validation.max}`);
      }
    }
  }

  return errors;
};
