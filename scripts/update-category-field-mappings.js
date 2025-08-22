// scripts/update-category-field-mappings.js
// Run this script to update existing category field mappings to use category references

const { createClient } = require("@sanity/client");

// Configure your Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false,
  apiVersion: "2024-01-01",
  token: process.env.SANITY_API_WRITE_TOKEN,
});

async function updateCategoryFieldMappings() {

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
    // Fetch existing category field mappings
    const existingMappings = await client.fetch(`
      *[_type == "categoryFieldMapping"] {
        _id,
        categoryName,
        categoryType,
        requiredFields,
        optionalFields,
        isActive,
        description
      }
    `);

    // Update each mapping to use category reference instead of categoryName
    for (const mapping of existingMappings) {
      const categoryId = categoryMap[mapping.categoryName];

      if (categoryId) {
     

        await client
          .patch(mapping._id)
          .set({
            category: {
              _type: "reference",
              _ref: categoryId,
            },
          })
          .unset(["categoryName"]) // Remove the old categoryName field
          .commit();

      } else {
      }
    }

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
updateCategoryFieldMappings();
