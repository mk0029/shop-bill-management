// scripts/create-mfd-specification-options.js
// Run this script to create MFD specification options in Sanity

const { createClient } = require("@sanity/client");

// Configure your Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_WRITE_TOKEN,
});

// Common MFD values for capacitors
const mfdOptions = [
  { value: "1", label: "1 MFD", sortOrder: 1 },
  { value: "2", label: "2 MFD", sortOrder: 2 },
  { value: "2.5", label: "2.5 MFD", sortOrder: 3 },
  { value: "3", label: "3 MFD", sortOrder: 4 },
  { value: "4", label: "4 MFD", sortOrder: 5 },
  { value: "5", label: "5 MFD", sortOrder: 6 },
  { value: "6", label: "6 MFD", sortOrder: 7 },
  { value: "8", label: "8 MFD", sortOrder: 8 },
  { value: "10", label: "10 MFD", sortOrder: 10 },
  { value: "12", label: "12 MFD", sortOrder: 12 },
  { value: "15", label: "15 MFD", sortOrder: 15 },
  { value: "16", label: "16 MFD", sortOrder: 16 },
  { value: "20", label: "20 MFD", sortOrder: 20 },
  { value: "25", label: "25 MFD", sortOrder: 25 },
  { value: "30", label: "30 MFD", sortOrder: 30 },
  { value: "35", label: "35 MFD", sortOrder: 35 },
  { value: "40", label: "40 MFD", sortOrder: 40 },
  { value: "45", label: "45 MFD", sortOrder: 45 },
  { value: "50", label: "50 MFD", sortOrder: 50 },
  { value: "60", label: "60 MFD", sortOrder: 60 },
  { value: "70", label: "70 MFD", sortOrder: 70 },
  { value: "80", label: "80 MFD", sortOrder: 80 },
  { value: "100", label: "100 MFD", sortOrder: 100 },
];

async function createMfdSpecificationOptions() {

  try {
    // Create MFD specification options
    for (const option of mfdOptions) {
      const specOption = {
        _type: "specificationOption",
        type: "mfd",
        value: option.value,
        label: option.label,
        categories: ["capacitor", "motor", "pump", "fan"], // Categories that use MFD
        sortOrder: option.sortOrder,
        isActive: true,
        description: `${option.label} capacitor rating`,
      };
    }
  } catch (error) {
    console.error("❌ Failed to create MFD specification options:", error);
    process.exit(1);
  }
}

// Run the script
createMfdSpecificationOptions();
