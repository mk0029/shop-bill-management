import { sanityClient, queries } from "./sanity";

// Test function to check Sanity connection and data
export async function testSanityConnection() {
  try {
    console.log("🔍 Testing Sanity connection...");

    // Test basic connection
    const testQuery = '*[_type match "*"][0...5] { _type, _id }';
    const allDocs = await sanityClient.fetch(testQuery);
    console.log("📄 Available documents:", allDocs);

    // Check document types
    const typesQuery =
      '*[] | { "type": _type } | group(type) | { "documentType": type, "count": count() }';
    const documentTypes = await sanityClient.fetch(typesQuery);
    console.log("📊 Document types:", documentTypes);

    // Test specific queries
    console.log("🏷️ Testing brands query...");
    try {
      const brands = await sanityClient.fetch(queries.brands);
      console.log("✅ Brands loaded:", brands.length, "items");
      console.log("First brand:", brands[0]);
    } catch (error) {
      console.log("❌ Brands query failed:", error);

      // Try legacy brands
      console.log("🔄 Trying legacy brands...");
      const legacyBrands = await sanityClient.fetch('*[_type == "brands"]');
      console.log("Legacy brands:", legacyBrands);
    }

    console.log("🏷️ Testing categories query...");
    try {
      const categories = await sanityClient.fetch(queries.categories);
      console.log("✅ Categories loaded:", categories.length, "items");
    } catch (error) {
      console.log("❌ Categories query failed:", error);
    }

    console.log("📦 Testing products query...");
    try {
      const products = await sanityClient.fetch(queries.products);
      console.log("✅ Products loaded:", products.length, "items");
    } catch (error) {
      console.log("❌ Products query failed:", error);
    }

    return {
      success: true,
      documentTypes,
      totalDocuments: allDocs.length,
    };
  } catch (error) {
    console.error("❌ Sanity connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Simplified queries that should work with any data
export const fallbackQueries = {
  // Get any brand-like documents
  brands:
    '*[_type match "*brand*"] { _id, _type, name: coalesce(name, title), slug, logo, description }',

  // Get any category-like documents
  categories:
    '*[_type match "*categor*"] { _id, _type, name, slug, description }',

  // Get any product-like documents
  products:
    '*[_type match "*product*"] { _id, _type, name, slug, description }',

  // Get any user-like documents
  users: '*[_type match "*user*"] { _id, _type, name, email, phone, role }',

  // Get any bill-like documents
  bills:
    '*[_type match "*bill*"] { _id, _type, billNumber, totalAmount, status }',
};
