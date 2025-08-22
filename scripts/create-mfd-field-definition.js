// scripts/create-mfd-field-definition.js
// Run this script to create the MFD field definition in Sanity

const { createClient } = require("@sanity/client");

// Configure your Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_WRITE_TOKEN,
});

async function createMfdFieldDefinition() {

  try {
    // Create the MFD field definition
    const mfdFieldDefinition = {
      _type: "fieldDefinition",
      fieldKey: "mfd",
      fieldLabel: "Cap MFD",
      fieldType: "number",
      description: "Capacitor MFD (Microfarad) rating",
      placeholder: "Enter MFD value",
      validationRules: {
        required: false,
        minValue: 0,
        maxValue: 10000,
        customErrorMessage: "MFD value must be between 0 and 10000",
      },
      defaultValue: "0",
      sortOrder: 15,
      isActive: true,
      applicableCategories: ["capacitor", "motor", "pump", "fan"],
    };


    const result = await client.create(mfdFieldDefinition);
   
  } catch (error) {
    console.error("❌ Failed to create MFD field definition:", error);
    process.exit(1);
  }
}

// Run the script
createMfdFieldDefinition();
