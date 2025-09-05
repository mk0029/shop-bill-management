// scripts/migrate-specifications-to-sanity.js
// Run this script to populate Sanity with initial specification data

const { createClient } = require("@sanity/client");

// Configure your Sanity client
const client = createClient({
  projectId: "your-project-id", // Replace with your project ID
  dataset: "production", // or your dataset name
  useCdn: false,
  apiVersion: "2024-01-01",
  token: "your-write-token", // Replace with your write token
});

// Initial specification data
const initialSpecifications = [
  // Amperage Options
  {
    type: "amperage",
    value: "1A",
    label: "1A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 1,
  },
  {
    type: "amperage",
    value: "2A",
    label: "2A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 2,
  },
  {
    type: "amperage",
    value: "3A",
    label: "3A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 3,
  },
  {
    type: "amperage",
    value: "5A",
    label: "5A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 5,
  },
  {
    type: "amperage",
    value: "6A",
    label: "6A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 6,
  },
  {
    type: "amperage",
    value: "10A",
    label: "10A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 10,
  },
  {
    type: "amperage",
    value: "13A",
    label: "13A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 13,
  },
  {
    type: "amperage",
    value: "15A",
    label: "15A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 15,
  },
  {
    type: "amperage",
    value: "16A",
    label: "16A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 16,
  },
  {
    type: "amperage",
    value: "20A",
    label: "20A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 20,
  },
  {
    type: "amperage",
    value: "25A",
    label: "25A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 25,
  },
  {
    type: "amperage",
    value: "32A",
    label: "32A",
    categories: ["switch", "socket", "mcb"],
    sortOrder: 32,
  },
  {
    type: "amperage",
    value: "40A",
    label: "40A",
    categories: ["mcb", "switch"],
    sortOrder: 40,
  },
  {
    type: "amperage",
    value: "50A",
    label: "50A",
    categories: ["mcb", "switch"],
    sortOrder: 50,
  },
  {
    type: "amperage",
    value: "63A",
    label: "63A",
    categories: ["mcb"],
    sortOrder: 63,
  },
  {
    type: "amperage",
    value: "80A",
    label: "80A",
    categories: ["mcb"],
    sortOrder: 80,
  },
  {
    type: "amperage",
    value: "100A",
    label: "100A",
    categories: ["mcb"],
    sortOrder: 100,
  },

  // Voltage Options
  {
    type: "voltage",
    value: "12V",
    label: "12V",
    categories: ["light", "motor"],
    sortOrder: 12,
  },
  {
    type: "voltage",
    value: "24V",
    label: "24V",
    categories: ["light", "motor"],
    sortOrder: 24,
  },
  {
    type: "voltage",
    value: "110V",
    label: "110V",
    categories: ["motor", "pump"],
    sortOrder: 110,
  },
  {
    type: "voltage",
    value: "220V",
    label: "220V",
    categories: ["light", "motor", "pump"],
    sortOrder: 220,
  },
  {
    type: "voltage",
    value: "240V",
    label: "240V",
    categories: ["motor", "pump"],
    sortOrder: 240,
  },
  {
    type: "voltage",
    value: "415V",
    label: "415V",
    categories: ["motor", "pump"],
    sortOrder: 415,
  },

  // Wire Gauge Options
  {
    type: "wireGauge",
    value: "1.0mm",
    label: "1.0 sq mm",
    categories: ["wire", "cable"],
    sortOrder: 1,
  },
  {
    type: "wireGauge",
    value: "1.5mm",
    label: "1.5 sq mm",
    categories: ["wire", "cable"],
    sortOrder: 2,
  },
  {
    type: "wireGauge",
    value: "2.5mm",
    label: "2.5 sq mm",
    categories: ["wire", "cable"],
    sortOrder: 3,
  },
  {
    type: "wireGauge",
    value: "4.0mm",
    label: "4.0 sq mm",
    categories: ["wire", "cable"],
    sortOrder: 4,
  },
  {
    type: "wireGauge",
    value: "6.0mm",
    label: "6.0 sq mm",
    categories: ["wire", "cable"],
    sortOrder: 5,
  },
  {
    type: "wireGauge",
    value: "10.0mm",
    label: "10.0 sq mm",
    categories: ["wire", "cable"],
    sortOrder: 6,
  },
  {
    type: "wireGauge",
    value: "16.0mm",
    label: "16.0 sq mm",
    categories: ["wire", "cable"],
    sortOrder: 7,
  },
  {
    type: "wireGauge",
    value: "25.0mm",
    label: "25.0 sq mm",
    categories: ["wire", "cable"],
    sortOrder: 8,
  },

  // Light Type Options
  {
    type: "lightType",
    value: "LED",
    label: "LED",
    categories: ["light", "bulb", "led"],
    sortOrder: 1,
  },
  {
    type: "lightType",
    value: "Bulb",
    label: "Bulb",
    categories: ["light", "bulb"],
    sortOrder: 2,
  },
  {
    type: "lightType",
    value: "Tube Light",
    label: "Tube Light",
    categories: ["light"],
    sortOrder: 3,
  },
  {
    type: "lightType",
    value: "Panel Light",
    label: "Panel Light",
    categories: ["light"],
    sortOrder: 4,
  },
  {
    type: "lightType",
    value: "Concealed Light",
    label: "Concealed Light",
    categories: ["light"],
    sortOrder: 5,
  },
  {
    type: "lightType",
    value: "Street Light",
    label: "Street Light",
    categories: ["light"],
    sortOrder: 6,
  },
  {
    type: "lightType",
    value: "Flood Light",
    label: "Flood Light",
    categories: ["light"],
    sortOrder: 7,
  },

  // Color Options
  {
    type: "color",
    value: "White",
    label: "White",
    categories: ["light", "bulb", "led"],
    sortOrder: 1,
  },
  {
    type: "color",
    value: "Warm White",
    label: "Warm White",
    categories: ["light", "bulb", "led"],
    sortOrder: 2,
  },
  {
    type: "color",
    value: "Cool White",
    label: "Cool White",
    categories: ["light", "bulb", "led"],
    sortOrder: 3,
  },
  {
    type: "color",
    value: "Yellow",
    label: "Yellow",
    categories: ["light", "bulb"],
    sortOrder: 4,
  },
  {
    type: "color",
    value: "Red",
    label: "Red",
    categories: ["wire", "cable"],
    sortOrder: 5,
  },
  {
    type: "color",
    value: "Black",
    label: "Black",
    categories: ["wire", "cable"],
    sortOrder: 6,
  },
  {
    type: "color",
    value: "Blue",
    label: "Blue",
    categories: ["wire", "cable"],
    sortOrder: 7,
  },
  {
    type: "color",
    value: "Green",
    label: "Green",
    categories: ["wire", "cable"],
    sortOrder: 8,
  },

  // Size Options
  {
    type: "size",
    value: "1ft",
    label: "1 ft",
    categories: ["light"],
    sortOrder: 1,
  },
  {
    type: "size",
    value: "2ft",
    label: "2 ft",
    categories: ["light"],
    sortOrder: 2,
  },
  {
    type: "size",
    value: "3ft",
    label: "3 ft",
    categories: ["light"],
    sortOrder: 3,
  },
  {
    type: "size",
    value: "4ft",
    label: "4 ft",
    categories: ["light"],
    sortOrder: 4,
  },
  {
    type: "size",
    value: "Small",
    label: "Small",
    categories: ["light", "motor", "pump"],
    sortOrder: 5,
  },
  {
    type: "size",
    value: "Medium",
    label: "Medium",
    categories: ["light", "motor", "pump"],
    sortOrder: 6,
  },
  {
    type: "size",
    value: "Large",
    label: "Large",
    categories: ["light", "motor", "pump"],
    sortOrder: 7,
  },

  // Material Options
  {
    type: "material",
    value: "Plastic",
    label: "Plastic",
    categories: ["switch", "socket"],
    sortOrder: 1,
  },
  {
    type: "material",
    value: "Metal",
    label: "Metal",
    categories: ["switch", "socket", "light"],
    sortOrder: 2,
  },
  {
    type: "material",
    value: "Copper",
    label: "Copper",
    categories: ["wire", "cable"],
    sortOrder: 3,
  },
  {
    type: "material",
    value: "Aluminum",
    label: "Aluminum",
    categories: ["wire", "cable", "light"],
    sortOrder: 4,
  },
  {
    type: "material",
    value: "PVC",
    label: "PVC",
    categories: ["wire", "cable"],
    sortOrder: 5,
  },
  {
    type: "material",
    value: "Ceramic",
    label: "Ceramic",
    categories: ["socket"],
    sortOrder: 6,
  },

  // Core Options
  {
    type: "core",
    value: "1",
    label: "1 Core",
    categories: ["wire", "cable"],
    sortOrder: 1,
  },
  {
    type: "core",
    value: "2",
    label: "2 Core",
    categories: ["wire", "cable"],
    sortOrder: 2,
  },
  {
    type: "core",
    value: "3",
    label: "3 Core",
    categories: ["wire", "cable"],
    sortOrder: 3,
  },
  {
    type: "core",
    value: "4",
    label: "4 Core",
    categories: ["wire", "cable"],
    sortOrder: 4,
  },
  {
    type: "core",
    value: "multi",
    label: "Multi Core",
    categories: ["wire", "cable"],
    sortOrder: 5,
  },
];

// Initial category field mappings
const initialCategoryMappings = [
  // Ampere-based categories
  {
    categoryName: "switch",
    categoryType: "ampere",
    requiredFields: ["amperage"],
    optionalFields: ["material", "voltage"],
    isActive: true,
    description: "Electrical switches requiring amperage specification",
  },
  {
    categoryName: "socket",
    categoryType: "ampere",
    requiredFields: ["amperage"],
    optionalFields: ["material", "voltage"],
    isActive: true,
    description: "Electrical sockets requiring amperage specification",
  },
  {
    categoryName: "mcb",
    categoryType: "ampere",
    requiredFields: ["amperage"],
    optionalFields: ["voltage"],
    isActive: true,
    description: "Miniature Circuit Breakers requiring amperage specification",
  },
  {
    categoryName: "fuse",
    categoryType: "ampere",
    requiredFields: ["amperage"],
    optionalFields: ["voltage"],
    isActive: true,
    description: "Electrical fuses requiring amperage specification",
  },

  // Voltage-Watt based categories
  {
    categoryName: "motor",
    categoryType: "volt-watt",
    requiredFields: ["voltage", "wattage"],
    optionalFields: ["size", "material"],
    isActive: true,
    description: "Electric motors requiring voltage and wattage specifications",
  },
  {
    categoryName: "pump",
    categoryType: "volt-watt",
    requiredFields: ["voltage", "wattage"],
    optionalFields: ["size", "material"],
    isActive: true,
    description: "Water pumps requiring voltage and wattage specifications",
  },

  // Wire/Cable based categories
  {
    categoryName: "wire",
    categoryType: "wire",
    requiredFields: ["wireGauge"],
    optionalFields: ["color", "material", "core"],
    isActive: true,
    description: "Electrical wires requiring gauge specification",
  },
  {
    categoryName: "cable",
    categoryType: "wire",
    requiredFields: ["wireGauge"],
    optionalFields: ["color", "material", "core"],
    isActive: true,
    description: "Electrical cables requiring gauge specification",
  },

  // Light based categories
  {
    categoryName: "light",
    categoryType: "light",
    requiredFields: ["lightType"],
    optionalFields: ["color", "size", "wattage", "voltage"],
    isActive: true,
    description: "Lighting products requiring light type specification",
  },
  {
    categoryName: "bulb",
    categoryType: "light",
    requiredFields: ["lightType"],
    optionalFields: ["color", "size", "wattage", "voltage"],
    isActive: true,
    description: "Light bulbs requiring light type specification",
  },

  // General categories
  {
    categoryName: "tool",
    categoryType: "general",
    requiredFields: [],
    optionalFields: ["size", "material"],
    isActive: true,
    description: "General tools with optional specifications",
  },
  {
    categoryName: "safety",
    categoryType: "general",
    requiredFields: [],
    optionalFields: ["size", "material"],
    isActive: true,
    description: "Safety equipment with optional specifications",
  },
];

async function migrateSpecifications() {
  try {
    // Create specification options
    const specificationDocs = initialSpecifications.map((spec) => ({
      _type: "specificationOption",
      ...spec,
      isActive: true,
    }));

    const createdSpecs = await client.createOrReplace(specificationDocs);

    // Create category field mappings
    const mappingDocs = initialCategoryMappings.map((mapping) => ({
      _type: "categoryFieldMapping",
      ...mapping,
    }));

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateSpecifications();
