/**
 * Migration Script: Legacy Fields to Dynamic Fields
 * Migrates existing field definitions and category mappings to the new dynamic field system
 */

const { sanityClient } = require("../src/lib/sanity");

// Common field configurations based on existing system
const PREDEFINED_DYNAMIC_FIELDS = [
  {
    key: "watts",
    label: "Watts",
    type: "number",
    categoryType: "volt-watt",
    required: true,
    validation: {
      min: 0.1,
      max: 2000,
      errorMessage: "Watts must be between 0.1W and 2000W",
    },
    formatting: {
      suffix: "W",
      decimalPlaces: 1,
    },
    placeholder: "Enter watts (e.g., 9, 100, 500)",
    description: "Power consumption in watts",
    displayOrder: 1,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
  {
    key: "voltage",
    label: "Voltage",
    type: "select",
    categoryType: "volt-watt",
    required: true,
    options: [
      { value: "12V", label: "12V" },
      { value: "24V", label: "24V" },
      { value: "110V", label: "110V" },
      { value: "220V", label: "220V" },
      { value: "240V", label: "240V" },
      { value: "415V", label: "415V" },
    ],
    optionsSource: "static",
    placeholder: "Select voltage",
    description: "Operating voltage",
    displayOrder: 2,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
  {
    key: "amperage",
    label: "Amperage",
    type: "select",
    categoryType: "ampere",
    required: true,
    options: [
      { value: "6A", label: "6A" },
      { value: "10A", label: "10A" },
      { value: "16A", label: "16A" },
      { value: "20A", label: "20A" },
      { value: "25A", label: "25A" },
      { value: "32A", label: "32A" },
      { value: "40A", label: "40A" },
      { value: "63A", label: "63A" },
    ],
    optionsSource: "static",
    placeholder: "Select amperage",
    description: "Current rating in amperes",
    displayOrder: 3,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
  {
    key: "wireGauge",
    label: "Wire Gauge",
    type: "select",
    categoryType: "wire",
    required: true,
    options: [
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
    optionsSource: "static",
    placeholder: "Select wire gauge",
    description: "Wire thickness in square millimeters",
    displayOrder: 4,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
  {
    key: "core",
    label: "Core Type",
    type: "select",
    categoryType: "wire",
    required: true,
    options: [
      { value: "single", label: "Single Core" },
      { value: "multi", label: "Multi Core" },
      { value: "stranded", label: "Stranded" },
    ],
    optionsSource: "static",
    placeholder: "Select core type",
    description: "Core type of the wire",
    displayOrder: 5,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
  {
    key: "lightType",
    label: "Light Type",
    type: "select",
    categoryType: "light",
    required: true,
    options: [
      { value: "led", label: "LED" },
      { value: "cfl", label: "CFL" },
      { value: "incandescent", label: "Incandescent" },
      { value: "halogen", label: "Halogen" },
      { value: "fluorescent", label: "Fluorescent" },
    ],
    optionsSource: "static",
    placeholder: "Select light type",
    description: "Type of lighting technology",
    displayOrder: 6,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
  {
    key: "color",
    label: "Color",
    type: "select",
    categoryType: "general",
    options: [
      { value: "white", label: "White" },
      { value: "black", label: "Black" },
      { value: "red", label: "Red" },
      { value: "blue", label: "Blue" },
      { value: "green", label: "Green" },
      { value: "yellow", label: "Yellow" },
      { value: "brown", label: "Brown" },
      { value: "grey", label: "Grey" },
    ],
    optionsSource: "static",
    placeholder: "Select color",
    description: "Product color",
    displayOrder: 7,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
  {
    key: "size",
    label: "Size",
    type: "text",
    categoryType: "general",
    placeholder: "Enter size (e.g., small, medium, large)",
    description: "Size specification",
    displayOrder: 8,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
  {
    key: "lumens",
    label: "Lumens",
    type: "number",
    categoryType: "light",
    validation: {
      min: 1,
      max: 50000,
    },
    formatting: {
      suffix: " lm",
    },
    placeholder: "Enter lumens (e.g., 800, 1200, 1600)",
    description: "Light output in lumens",
    displayOrder: 9,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
  {
    key: "material",
    label: "Material",
    type: "select",
    categoryType: "general",
    options: [
      { value: "plastic", label: "Plastic" },
      { value: "metal", label: "Metal" },
      { value: "ceramic", label: "Ceramic" },
      { value: "glass", label: "Glass" },
      { value: "rubber", label: "Rubber" },
      { value: "copper", label: "Copper" },
      { value: "aluminum", label: "Aluminum" },
      { value: "steel", label: "Steel" },
    ],
    optionsSource: "static",
    placeholder: "Select material",
    description: "Material type",
    displayOrder: 10,
    searchable: true,
    sortable: true,
    exportable: true,
    isActive: true,
  },
];

// Field groups for organizing fields
const FIELD_GROUPS = [
  {
    name: "electrical",
    label: "Electrical Specifications",
    description: "Electrical properties and ratings",
    collapsible: true,
    defaultExpanded: true,
    displayOrder: 1,
    color: "blue",
    isActive: true,
  },
  {
    name: "physical",
    label: "Physical Properties",
    description: "Physical characteristics and dimensions",
    collapsible: true,
    defaultExpanded: true,
    displayOrder: 2,
    color: "green",
    isActive: true,
  },
  {
    name: "lighting",
    label: "Lighting Specifications",
    description: "Light-specific properties",
    collapsible: true,
    defaultExpanded: true,
    displayOrder: 3,
    color: "yellow",
    isActive: true,
  },
  {
    name: "wire",
    label: "Wire & Cable Specifications",
    description: "Wire and cable specific properties",
    collapsible: true,
    defaultExpanded: true,
    displayOrder: 4,
    color: "purple",
    isActive: true,
  },
];

/**
 * Create field groups
 */
async function createFieldGroups() {
  const createdGroups = {};

  for (const group of FIELD_GROUPS) {
    try {
      const created = await sanityClient.create({
        _type: "fieldGroup",
        ...group,
      });

      createdGroups[group.name] = created._id;
    } catch (error) {
    }
  }

  return createdGroups;
}

/**
 * Create dynamic specification fields
 */
async function createDynamicFields(fieldGroups) {

  const createdFields = {};

  for (const field of PREDEFINED_DYNAMIC_FIELDS) {
    try {
      // Assign field to appropriate group
      let groupId = null;
      if (
        field.categoryType === "volt-watt" ||
        field.categoryType === "ampere"
      ) {
        groupId = fieldGroups.electrical;
      } else if (field.categoryType === "light") {
        groupId = fieldGroups.lighting;
      } else if (field.categoryType === "wire") {
        groupId = fieldGroups.wire;
      } else {
        groupId = fieldGroups.physical;
      }

      const created = await sanityClient.create({
        _type: "dynamicSpecificationField",
        ...field,
        groupId: groupId ? { _ref: groupId, _type: "reference" } : null,
        version: 1,
        createdBy: "migration-script",
      });

      createdFields[field.key] = created._id;
    } catch (error) {
    }
  }

  return createdFields;
}

/**
 * Fetch existing categories
 */
async function fetchCategories() {
  const query = `*[_type == "category" && isActive == true] {
    _id,
    name,
    slug
  }`;

  const categories = await sanityClient.fetch(query);

  return categories;
}

/**
 * Create enhanced category field mappings
 */
async function createEnhancedCategoryMappings(
  categories,
  dynamicFields,
  fieldGroups
) {

  // Category type mappings based on category names
  const categoryTypeMappings = {
    switch: "ampere",
    socket: "ampere",
    mcb: "ampere",
    fuse: "ampere",
    changeover: "ampere",
    light: "light",
    bulb: "light",
    led: "light",
    motor: "volt-watt",
    pump: "volt-watt",
    geyser: "volt-watt",
    heater: "volt-watt",
    wire: "wire",
    cable: "wire",
  };

  // Field mappings by category type
  const fieldMappingsByType = {
    ampere: {
      required: ["amperage", "voltage"],
      optional: ["color", "material"],
    },
    "volt-watt": {
      required: ["watts", "voltage"],
      optional: ["color", "material"],
    },
    wire: {
      required: ["wireGauge", "core"],
      optional: ["color", "material"],
    },
    light: {
      required: ["watts", "lightType"],
      optional: ["lumens", "color", "voltage"],
    },
    general: {
      required: [],
      optional: ["color", "size", "material"],
    },
  };

  for (const category of categories) {
    try {
      // Determine category type
      const categoryName = category.name.toLowerCase();
      let categoryType = "general";

      for (const [key, type] of Object.entries(categoryTypeMappings)) {
        if (categoryName.includes(key)) {
          categoryType = type;
          break;
        }
      }

      // Get field mappings for this category type
      const fieldMapping = fieldMappingsByType[categoryType];

      // Map field keys to field IDs
      const requiredFieldIds = fieldMapping.required
        .map((key) => dynamicFields[key])
        .filter(Boolean)
        .map((id) => ({ _ref: id, _type: "reference" }));

      const optionalFieldIds = fieldMapping.optional
        .map((key) => dynamicFields[key])
        .filter(Boolean)
        .map((id) => ({ _ref: id, _type: "reference" }));

      const allFieldIds = [...requiredFieldIds, ...optionalFieldIds];

      // Create enhanced category mapping
      const mapping = await sanityClient.create({
        _type: "enhancedCategoryFieldMapping",
        category: {
          _ref: category._id,
          _type: "reference",
        },
        categoryType,
        dynamicFields: allFieldIds,
        requiredDynamicFields: requiredFieldIds,
        allowCustomFields: false,
        maxCustomFields: 5,
        validationRules: {
          requireAtLeastOneField: true,
          maxFieldsPerProduct: 20,
        },
        isActive: true,
        description: `Enhanced field mapping for ${category.name} category`,
        version: 1,
        migrationStatus: "completed",
      });


    } catch (error) {
     
      
    }
  }
}

/**
 * Main migration function
 */
async function runMigration() {

  try {
    // Step 1: Create field groups
    const fieldGroups = await createFieldGroups();

    // Step 2: Create dynamic specification fields
    const dynamicFields = await createDynamicFields(fieldGroups);

    // Step 3: Fetch existing categories
    const categories = await fetchCategories();

    // Step 4: Create enhanced category field mappings
    await createEnhancedCategoryMappings(
      categories,
      dynamicFields,
      fieldGroups
    );

   
  } catch (error) {
    process.exit(1);
  }
}

/**
 * Rollback migration (for testing)
 */
async function rollbackMigration() {

  try {
    // Delete enhanced category mappings
    await sanityClient.delete({
      query: '*[_type == "enhancedCategoryFieldMapping"]',
    });

    // Delete dynamic specification fields
    await sanityClient.delete({
      query: '*[_type == "dynamicSpecificationField"]',
    });

    // Delete field groups
    await sanityClient.delete({
      query: '*[_type == "fieldGroup"]',
    });

  } catch (error) {
    console.error("❌ Rollback failed:", error);
    process.exit(1);
  }
}

// Command line interface
const command = process.argv[2];

if (command === "migrate") {
  runMigration();
} else if (command === "rollback") {
  rollbackMigration();
} else {

}

module.exports = {
  runMigration,
  rollbackMigration,
  PREDEFINED_DYNAMIC_FIELDS,
  FIELD_GROUPS,
};
