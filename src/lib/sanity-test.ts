import { sanityClient, queries } from "./sanity";

// Safe array filter to remove null/undefined items
const filterValidItems = (items: unknown[]) => {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && item._id);
};

// Test function to check Sanity connection and data
export async function testSanityConnection() {
  try {
    console.log("🔍 Testing Sanity connection...");

    // Test the most basic query first
    const basicQuery = "*[0...3] { _type, _id }";
    const basicResult = await sanityClient.fetch(basicQuery);
    console.log("📄 Basic query raw result:", basicResult);

    const validBasicDocs = filterValidItems(basicResult);
    console.log("📄 Valid basic documents:", validBasicDocs.length);

    if (validBasicDocs.length === 0) {
      console.log("⚠️ No valid documents found in dataset");
      return {
        success: false,
        error: "No valid documents found in dataset",
      };
    }

    // Check document types
    const typesQuery =
      '*[] | { "type": _type } | group(type) | { "documentType": type, "count": count() }';
    const documentTypes = await sanityClient.fetch(typesQuery);
    console.log("📊 Document types:", documentTypes);

    // Test specific queries with safe filtering
    console.log("🏷️ Testing brands query...");
    try {
      const brandsRaw = await sanityClient.fetch(queries.brands);
      const brands = filterValidItems(brandsRaw);
      console.log("✅ Brands loaded:", brands.length, "valid items");
      if (brands.length > 0) {
        console.log("First brand:", brands[0]);
      } else {
        console.log("No valid brands found in dataset");
      }
    } catch (error) {
      console.log("❌ Brands query failed:", error);

      // Try simple brands query
      console.log("🔄 Trying simple brands query...");
      try {
        const simpleBrandsRaw = await sanityClient.fetch(
          '*[_type == "brand" || _type == "brands"][0...3]'
        );
        const simpleBrands = filterValidItems(simpleBrandsRaw);
        console.log("Simple brands:", simpleBrands.length, "valid items");
      } catch (simpleError) {
        console.log("❌ Simple brands also failed:", simpleError);
      }
    }

    console.log("🏷️ Testing categories query...");
    try {
      const categoriesRaw = await sanityClient.fetch(queries.categories);
      const categories = filterValidItems(categoriesRaw);
      console.log("✅ Categories loaded:", categories.length, "valid items");
      if (categories.length > 0) {
        console.log("First category:", categories[0]);
      }
    } catch (error) {
      console.log("❌ Categories query failed:", error);
    }

    console.log("📦 Testing products query...");
    try {
      const productsRaw = await sanityClient.fetch(queries.products);
      const products = filterValidItems(productsRaw);
      console.log("✅ Products loaded:", products.length, "valid items");
      if (products.length > 0) {
        console.log("First product:", products[0]);
      }
    } catch (error) {
      console.log("❌ Products query failed:", error);
    }

    return {
      success: true,
      documentTypes,
      totalDocuments: validBasicDocs.length,
    };
  } catch (error) {
    console.error("❌ Sanity connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Debug function to safely test individual queries
export async function debugSanityQuery(queryName: string, query: string) {
  try {
    console.log(`🔍 Testing ${queryName}:`, query);
    const result = await sanityClient.fetch(query);

    if (!result) {
      console.log(`❌ ${queryName} returned null/undefined`);
      return { success: false, error: "Query returned null" };
    }

    if (Array.isArray(result)) {
      const validItems = filterValidItems(result);
      console.log(
        `✅ ${queryName} returned array with ${result.length} total items, ${validItems.length} valid`
      );

      const nullItems = result.filter((item) => !item || !item._id);
      if (nullItems.length > 0) {
        console.log(
          `⚠️ Found ${nullItems.length} null/invalid items in ${queryName}`
        );
      }
      return { success: true, data: validItems, nullCount: nullItems.length };
    } else {
      console.log(`✅ ${queryName} returned single object:`, result);
      return { success: true, data: result };
    }
  } catch (error) {
    console.log(`❌ ${queryName} failed:`, error);
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
    '*[_type match "*brand*"][defined(_id)] { _id, _type, name: coalesce(name, title), slug, logo, description }',

  // Get any category-like documents
  categories:
    '*[_type match "*categor*"][defined(_id)] { _id, _type, name, slug, description }',

  // Get any product-like documents
  products:
    '*[_type match "*product*"][defined(_id)] { _id, _type, name, slug, description }',

  // Get any user-like documents
  users:
    '*[_type match "*user*"][defined(_id)] { _id, _type, name, email, phone, role }',

  // Get any bill-like documents
  bills:
    '*[_type match "*bill*"][defined(_id)] { _id, _type, billNumber, totalAmount, status }',
};
