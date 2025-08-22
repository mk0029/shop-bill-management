// scripts/create-category-field-mappings.js
// Run this script to create category field mappings with proper category references

const { createClient } = require("@sanity/client");

// Configure your Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_WRITE_TOKEN,
});

// Category field mappings with category slugs (will be converted to references)
const categoryMappings = [
  // Ampere-based categories
  {
    categorySlug: "switch",
    categoryType: "ampere",
    requiredFields: ["amperage"],
    optionalFields: ["material", "voltage"],
    isActive: true,
    description: "Electrical switches requiring amperage specification",
  },
  {
    categorySlug: "capacitor",
    categoryType: "ampere",
    requiredFields: ["mfd"],
    optionalFields: ["voltage", "amperage"],
    isActive: true,
    description: "Capacitors requiring MFD specification",
  },
  {
    categorySlug: "socket",
    categoryType: "ampere",
    requiredFields: ["amperage"],
    optionalFields: ["material", "voltage"],
    isActive: true,
    description: "Electrical sockets requiring amperage specification",
  },
  {
    categorySlug: "mcb",
    categoryType: "ampere",
    requiredFields: ["amperage"],
    optionalFields: ["voltage"],
    isActive: true,
    description: "Miniature Circuit Breakers requiring amperage specification",
  },
  {
    categorySlug: "fuse",
    categoryType: "ampere",
    requiredFields: ["amperage"],
    optionalFields: ["voltage"],
    isActive: true,
    description: "Electrical fuses requiring amperage specification",
  },

  // Voltage-Watt based categories
  {
    categorySlug: "motor",
    categoryType: "volt-watt",
    requiredFields: ["voltage", "wattage"],
    optionalFields: ["size", "material", "mfd"],
    isActive: true,
    description: "Electric motors requiring voltage and wattage specifications",
  },
  {
    categorySlug: "pump",
    categoryType: "volt-watt",
    requiredFields: ["voltage", "wattage"],
    optionalFields: ["size", "material", "mfd"],
    isActive: true,
    description: "Water pumps requiring voltage and wattage specifications",
  },
  {
    categorySlug: "fan",
    categoryType: "volt-watt",
    requiredFields: ["voltage", "wattage"],
    optionalFields: ["size", "material", "mfd"],
    isActive: true,
    description: "Electric fans requiring voltage and wattage specifications",
  },

  // Wire/Cable based categories
  {
    categorySlug: "wire",
    categoryType: "wire",
    requiredFields: ["wireGauge"],
    optionalFields: ["color", "material", "core"],
    isActive: true,
    description: "Electrical wires requiring gauge specification",
  },
  {
    categorySlug: "cable",
    categoryType: "wire",
    requiredFields: ["wireGauge"],
    optionalFields: ["color", "material", "core"],
    isActive: true,
    description: "Electrical cables requiring gauge specification",
  },

  // Light based categories
  {
    categorySlug: "light",
    categoryType: "light",
    requiredFields: ["lightType"],
    optionalFields: ["color", "size", "wattage", "voltage"],
    isActive: true,
    description: "Lighting products requiring light type specification",
  },
  {
    categorySlug: "bulb",
    categoryType: "light",
    requiredFields: ["lightType"],
    optionalFields: ["color", "size", "wattage", "voltage"],
    isActive: true,
    description: "Light bulbs requiring light type specification",
  },

  // General categories
  {
    categorySlug: "tool",
    categoryType: "general",
    requiredFields: [],
    optionalFields: ["size", "material"],
    isActive: true,
    description: "General tools with optional specifications",
  },
  {
    categorySlug: "safety",
    categoryType: "general",
    requiredFields: [],
    optionalFields: ["size", "material"],
    isActive: true,
    description: "Safety equipment with optional specifications",
  },
];

async function createCategoryFieldMappings() {
  try {
    // First, fetch all categories to create a mapping from slug to ID
    const categories = await client.fetch(`
      *[_type == "category"] {
        _id,
        name,
        slug
      }
    `);
    const categoryMap = {};
    categories.forEach((cat) => {
      if (cat.slug?.current) {
        categoryMap[cat.slug.current] = cat._id;
      }
    });

    // Fetch all field definitions to create a mapping from fieldKey to ID
    const fieldDefinitions = await client.fetch(`
      *[_type == "fieldDefinition"] {
        _id,
        fieldKey
      }
    `);
    const fieldMap = {};
    fieldDefinitions.forEach((field) => {
      fieldMap[field.fieldKey] = field._id;
    });
    // Create category field mappings
    for (const mapping of categoryMappings) {
      const categoryId = categoryMap[mapping.categorySlug];

      if (!categoryId) {
        continue;
      }

      // Convert field keys to references
      const requiredFieldRefs = mapping.requiredFields
        .map((fieldKey) => fieldMap[fieldKey])
        .filter(Boolean)
        .map((fieldId) => ({
          _type: "reference",
          _ref: fieldId,
        }));

      const optionalFieldRefs = mapping.optionalFields
        .map((fieldKey) => fieldMap[fieldKey])
        .filter(Boolean)
        .map((fieldId) => ({
          _type: "reference",
          _ref: fieldId,
        }));

      const mappingDoc = {
        _type: "categoryFieldMapping",
        category: {
          _type: "reference",
          _ref: categoryId,
        },
        categoryType: mapping.categoryType,
        requiredFields: requiredFieldRefs,
        optionalFields: optionalFieldRefs,
        isActive: mapping.isActive,
        description: mapping.description,
      };



    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
createCategoryFieldMappings();
