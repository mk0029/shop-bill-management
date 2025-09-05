/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Utility functions for intelligent product naming
 */

// Helper function to check if a string looks like a UUID
export const isUUID = (str: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

// Get a proper display name, avoiding UUIDs
export const getDisplayName = (
  name: string | undefined,
  fallback: string
): string => {
  if (!name) return fallback;
  if (typeof name === "string" && isUUID(name)) return fallback;
  return name;
};

// Generate intelligent product name based on category, brand, and specifications
export const generateProductName = (product: any): string => {
  const categoryName = getDisplayName(
    product.category?.name,
    "Unknown Category"
  );
  const brandName = getDisplayName(product.brand?.name, "Unknown Brand");

  // Look for specification keys ending with "For" (like kitFor, itemFor)
  const specifications = product.specifications || {};
  const forKeys = Object.keys(specifications).filter(
    (key) => key.toLowerCase().endsWith("for") && specifications[key]
  );

  if (forKeys.length > 0) {
    // Use the first "For" specification found
    const forKey = forKeys[0];
    const forValue = specifications[forKey];

    // Clean up the forValue if it's also a UUID or reference
    const cleanForValue = getDisplayName(forValue, forKey.replace("For", ""));

    // When "For" keys exist, exclude brand name
    return `${categoryName} - ${cleanForValue}`;
  }

  // Fallback to category - brand
  return `${categoryName} - ${brandName}`;
};

// Enhanced product name generation with more specification handling
export const generateEnhancedProductName = (product: any): string => {
  const categoryName = getDisplayName(
    product.category?.name,
    "Unknown Category"
  );
  const brandName = getDisplayName(product.brand?.name, "Unknown Brand");

  const specifications = product.specifications || {};
  const specParts: string[] = [];

  // Priority order for specification keys
  const priorityKeys = ["kitFor", "itemFor", "usedFor", "designedFor"];
  const otherForKeys = Object.keys(specifications).filter(
    (key) =>
      key.toLowerCase().endsWith("for") &&
      !priorityKeys.includes(key) &&
      specifications[key]
  );

  // Check priority keys first
  for (const key of priorityKeys) {
    if (specifications[key]) {
      const value = getDisplayName(specifications[key], key.replace("For", ""));
      specParts.push(value);
      break; // Use only the first priority match
    }
  }

  // If no priority keys found, use other "For" keys
  if (specParts.length === 0 && otherForKeys.length > 0) {
    const key = otherForKeys[0];
    const value = getDisplayName(specifications[key], key.replace("For", ""));
    specParts.push(value);
  }

  // Add other important specifications (like model, size, etc.)
  const importantSpecs = ["model", "size", "capacity", "voltage", "power"];
  for (const key of importantSpecs) {
    if (specifications[key] && !isUUID(specifications[key])) {
      specParts.push(specifications[key]);
      break; // Add only one additional spec to keep name concise
    }
  }

  // Build the final name
  if (specParts.length > 0) {
    // When "For" keys exist, exclude brand name
    return `${categoryName} - ${specParts.join(" ")}`;
  }

  // Fallback to category - brand (only when no "For" keys)
  return `${categoryName} - ${brandName}`;
};

// Format product name for display in different contexts
export const formatProductNameForContext = (
  product: any,
  context: "alert" | "list" | "detail" | "short" = "list"
): string => {
  const fullName = generateEnhancedProductName(product);

  switch (context) {
    case "short":
      // For very limited space, check if there are "For" specifications
      const specifications = product.specifications || {};
      const hasForKeys = Object.keys(specifications).some(
        (key) => key.toLowerCase().endsWith("for") && specifications[key]
      );

      if (hasForKeys) {
        // If "For" keys exist, show just category
        return getDisplayName(product.category?.name, "Unknown");
      } else {
        // Otherwise show category - brand
        return `${getDisplayName(
          product.category?.name,
          "Unknown"
        )} - ${getDisplayName(product.brand?.name, "Unknown")}`;
      }

    case "alert":
      // For alerts, include stock info if available
      const stockInfo =
        product.inventory?.currentStock !== undefined
          ? ` (${product.inventory.currentStock} left)`
          : "";
      return fullName + stockInfo;

    case "detail":
      // For detailed view, include more specifications
      return generateEnhancedProductName(product);

    case "list":
    default:
      // Standard list view
      return fullName;
  }
};
