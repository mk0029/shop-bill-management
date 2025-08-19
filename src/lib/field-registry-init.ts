/**
 * Field Registry Initialization Utility
 * Handles the initialization and setup of the dynamic field registry
 */

import { initializeFieldRegistry } from "@/lib/field-registry";
import { FieldRegistryConfig } from "@/types/specification-field";
import { DEFAULT_REGISTRY_CONFIG } from "@/constants/specification-constants";

/**
 * Initialize the field registry with default configuration
 */
export const initFieldRegistry = async (): Promise<void> => {
  try {
    console.log("🚀 Initializing Dynamic Field Registry...");

    const startTime = performance.now();
    const registry = await initializeFieldRegistry(DEFAULT_REGISTRY_CONFIG);
    const endTime = performance.now();

    console.log(
      `✅ Field Registry initialized in ${(endTime - startTime).toFixed(2)}ms`
    );
    console.log(
      `📊 Loaded ${registry.getAllFields().length} field configurations`
    );

    // Log field summary
    const fieldsByType = registry.getAllFields().reduce(
      (acc, field) => {
        acc[field.type] = (acc[field.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log("📋 Field types loaded:", fieldsByType);
  } catch (error) {
    console.error("❌ Failed to initialize Field Registry:", error);
    throw error;
  }
};

/**
 * Initialize field registry with custom configuration
 */
export const initFieldRegistryWithConfig = async (
  config: Partial<FieldRegistryConfig>
): Promise<void> => {
  try {
    console.log("🚀 Initializing Dynamic Field Registry with custom config...");

    const mergedConfig = { ...DEFAULT_REGISTRY_CONFIG, ...config };
    const startTime = performance.now();
    const registry = await initializeFieldRegistry(mergedConfig);
    const endTime = performance.now();

    console.log(
      `✅ Field Registry initialized in ${(endTime - startTime).toFixed(2)}ms`
    );
    console.log("⚙️ Configuration:", mergedConfig);
  } catch (error) {
    console.error("❌ Failed to initialize Field Registry with config:", error);
    throw error;
  }
};

/**
 * Check if field registry is ready
 */
export const isFieldRegistryReady = (): boolean => {
  try {
    const { getFieldRegistry } = require("@/lib/field-registry");
    const registry = getFieldRegistry();
    return registry.isReady();
  } catch {
    return false;
  }
};

/**
 * Get field registry status
 */
export const getFieldRegistryStatus = () => {
  try {
    const { getFieldRegistry } = require("@/lib/field-registry");
    const registry = getFieldRegistry();

    return {
      isReady: registry.isReady(),
      fieldCount: registry.getAllFields().length,
      config: registry.getConfig(),
      performanceMetrics: registry.getPerformanceMetrics(),
    };
  } catch (error) {
    return {
      isReady: false,
      fieldCount: 0,
      config: null,
      performanceMetrics: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Auto-initialize field registry on app startup
 * Call this in your app's main entry point
 */
export const autoInitFieldRegistry = async (): Promise<void> => {
  // Only initialize in browser environment
  if (typeof window === "undefined") {
    return;
  }

  // Check if already initialized
  if (isFieldRegistryReady()) {
    console.log("✅ Field Registry already initialized");
    return;
  }

  // Initialize with retry logic
  let retries = 3;
  while (retries > 0) {
    try {
      await initFieldRegistry();
      break;
    } catch (error) {
      retries--;
      console.warn(
        `⚠️ Field Registry initialization failed, ${retries} retries left:`,
        error
      );

      if (retries === 0) {
        console.error(
          "❌ Field Registry initialization failed after all retries"
        );
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
};
