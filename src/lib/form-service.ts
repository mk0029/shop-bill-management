import { sanityClient } from "./sanity";
import {
  validateStockAvailability,
  fetchLatestPrices,
  updateStockForBill,
  BillItem,
} from "./inventory-management";
import { deduplicateBillItems, validateBillItems } from "./bill-utils";

export interface FormSubmissionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface ConfirmationData {
  title: string;
  message: string;
  data: unknown;
  type: "success" | "error" | "warning";
}

/**
 * Check if a user already exists with the given phone number
 */
export async function checkExistingUserByPhone(
  phone: string
): Promise<boolean> {
  try {
    console.log("🔍 Checking for existing user with phone:", phone);

    const query = `*[_type == "user" && phone == $phone][0] {
      _id,
      name,
      phone,
      customerId
    }`;

    const existingUser = await sanityClient.fetch(query, { phone });

    if (existingUser) {
      console.log("❌ User already exists with phone:", phone);
      return true;
    }

    console.log("✅ No existing user found with phone:", phone);
    return false;
  } catch (error) {
    console.error("Error checking existing user:", error);
    return false; // Assume no existing user if there's an error
  }
}

/**
 * Create a new customer in Sanity
 */
export async function createCustomer(customerData: {
  name: string;
  phone: string;
  location: string;
  email?: string;
}): Promise<FormSubmissionResult> {
  try {
    console.log("📝 Creating customer in Sanity:", customerData);

    // Check for existing user with same phone number
    const userExists = await checkExistingUserByPhone(customerData.phone);
    if (userExists) {
      return {
        success: false,
        error: "Account already exists with this phone number",
      };
    }

    // Generate customer credentials
    const customerId = Buffer.from(
      Date.now().toString() + Math.random().toString()
    )
      .toString("base64")
      .substring(0, 12);
    const secretKey = Buffer.from(
      Date.now().toString() + Math.random().toString()
    )
      .toString("base64")
      .substring(0, 16);

    const newCustomer = {
      _type: "user",
      clerkId: `customer_${Date.now()}`,
      customerId,
      secretKey,
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      location: customerData.location,
      role: "customer",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(newCustomer);

    console.log("✅ Customer created successfully:", result._id);

    return {
      success: true,
      data: {
        ...result,
        customerId,
        secretKey,
      },
      message: `Customer "${customerData.name}" has been created successfully!`,
    };
  } catch (error) {
    console.error("❌ Failed to create customer:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create customer",
    };
  }
}

/**
 * Create a new product in Sanity
 */
export async function createProduct(productData: {
  name: string;
  description?: string;
  brandId: string;
  categoryId: string;
  specifications: unknown;
  pricing: {
    purchasePrice: number;
    sellingPrice: number;
    mrp?: number;
    unit: string;
  };
  inventory: {
    currentStock: number;
    minimumStock: number;
    reorderLevel: number;
  };
  tags?: string[];
}): Promise<FormSubmissionResult> {
  try {
    console.log("📦 Creating product in Sanity:", productData);

    const productId = Buffer.from(
      Date.now().toString() + Math.random().toString()
    )
      .toString("base64")
      .substring(0, 12);

    // Find or create brand reference
    let brandReference;
    if (productData.brandId && productData.brandId.length > 10) {
      // This looks like a Sanity document ID
      brandReference = { _type: "reference", _ref: productData.brandId };
    } else {
      // This might be a brand name, try to find the brand
      const brandQuery = `*[_type == "brand" && name match "${productData.brandId}*"][0]._id`;
      const brandId = await sanityClient.fetch(brandQuery);
      if (brandId) {
        brandReference = { _type: "reference", _ref: brandId };
      } else {
        throw new Error(`Brand not found: ${productData.brandId}`);
      }
    }

    // Find or create category reference
    let categoryReference;
    if (
      productData.categoryId &&
      productData.categoryId.length > 10 &&
      productData.categoryId.includes("_")
    ) {
      // This looks like a Sanity document ID
      categoryReference = { _type: "reference", _ref: productData.categoryId };
    } else {
      // This is a category name, try to find or create the category
      // Clean the category name for better matching
      const cleanCategoryName = productData.categoryId.trim();

      // Try exact match first
      const exactQuery = `*[_type == "category" && name == $categoryName][0]._id`;
      let categoryId = await sanityClient.fetch(exactQuery, {
        categoryName: cleanCategoryName,
      });

      if (!categoryId) {
        // Try case-insensitive match
        const caseInsensitiveQuery = `*[_type == "category" && lower(name) == lower($categoryName)][0]._id`;
        categoryId = await sanityClient.fetch(caseInsensitiveQuery, {
          categoryName: cleanCategoryName,
        });
      }

      if (!categoryId) {
        // Create the category if it doesn't exist
        const categorySlug = cleanCategoryName
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
          .replace(/\s+/g, "-") // Replace spaces with hyphens
          .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
          .trim();

        const newCategory = await sanityClient.create({
          _type: "category",
          name: cleanCategoryName,
          slug: { current: categorySlug },
          isActive: true,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        categoryId = newCategory._id;
        console.log(
          `✅ Created new category: ${cleanCategoryName} with ID: ${categoryId}`
        );
      }

      categoryReference = { _type: "reference", _ref: categoryId };
    }

    const newProduct = {
      _type: "product",
      productId,
      name: productData.name,
      slug: {
        current: productData.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      },
      description: productData.description,
      brand: brandReference,
      category: categoryReference,
      specifications: productData.specifications,
      pricing: {
        ...productData.pricing,
        taxRate: 18, // Default GST rate
      },
      inventory: productData.inventory,
      images: [],
      isActive: true,
      isFeatured: false,
      tags: productData.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(newProduct);

    console.log("✅ Product created successfully:", result._id);

    return {
      success: true,
      data: result,
      message: `Product "${productData.name}" has been added to inventory!`,
    };
  } catch (error) {
    console.error("❌ Failed to create product:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create product",
    };
  }
}

/**
 * Create a new brand in Sanity
 */
export async function createBrand(brandData: {
  name: string;
  description?: string;
}): Promise<FormSubmissionResult> {
  try {
    console.log("🏷️ Creating brand in Sanity:", brandData);

    const newBrand = {
      _type: "brand",
      name: brandData.name,
      slug: { current: brandData.name.toLowerCase().replace(/\s+/g, "-") },
      description: brandData.description,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(newBrand);

    console.log("✅ Brand created successfully:", result._id);

    return {
      success: true,
      data: result,
      message: `Brand "${brandData.name}" has been created successfully!`,
    };
  } catch (error) {
    console.error("❌ Failed to create brand:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create brand",
    };
  }
}

/**
 * Create a new category in Sanity
 */
export async function createCategory(categoryData: {
  name: string;
  description?: string;
  icon?: string;
  parentCategory?: string;
}): Promise<FormSubmissionResult> {
  try {
    console.log("📂 Creating category in Sanity:", categoryData);

    const newCategory = {
      _type: "category",
      name: categoryData.name,
      slug: { current: categoryData.name.toLowerCase().replace(/\s+/g, "-") },
      description: categoryData.description,
      icon: categoryData.icon,
      parentCategory: categoryData.parentCategory
        ? { _type: "reference", _ref: categoryData.parentCategory }
        : undefined,
      isActive: true,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(newCategory);

    console.log("✅ Category created successfully:", result._id);

    return {
      success: true,
      data: result,
      message: `Category "${categoryData.name}" has been created successfully!`,
    };
  } catch (error) {
    console.error("❌ Failed to create category:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create category",
    };
  }
}

/**
 * Create a new bill in Sanity
 */
export async function createBill(billData: {
  customerId: string;
  items: Array<{
    productId?: string;
    productName: string;
    category?: string;
    brand?: string;
    specifications?: string;
    quantity: number;
    unitPrice?: number;
    unit?: string;
    isCustom?: boolean;
    isRewinding?: boolean;
  }>;
  serviceType: "repair" | "sale" | "installation" | "maintenance" | "custom";
  locationType: "shop" | "home" | "office";
  homeVisitFee?: number;
  repairCharges?: number;
  laborCharges?: number;
  notes?: string;
}): Promise<FormSubmissionResult> {
  try {
    console.log("🧾 Creating bill in Sanity:", billData);

    // Step 1: Map and deduplicate bill items
    const mappedItems = billData.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      category: item.category || "",
      brand: item.brand || "",
      specifications: item.specifications || "",
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.quantity * (item.unitPrice || 0),
      unit: item.unit || "pcs",
      isCustom: item.isCustom || false,
      isRewinding: item.isRewinding || false,
    }));

    const deduplicatedItems = deduplicateBillItems(mappedItems);

    console.log(
      "🔄 Deduplicated items:",
      deduplicatedItems.length,
      "from",
      billData.items.length
    );

    // Step 2: Validate all items for basic integrity
    const itemValidation = validateBillItems(deduplicatedItems);
    if (!itemValidation.isValid) {
      console.error("❌ Item validation failed:", itemValidation.errors);
      return {
        success: false,
        error: `Item validation failed: ${itemValidation.errors.join(", ")}`,
      };
    }

    // Step 3: Filter for standard items to perform inventory checks (exclude custom items)
    const standardItems = deduplicatedItems.filter(
      (item): item is typeof item & { productId: string } =>
        !!item.productId && !item.isCustom && !item.isRewinding
    );

    // Step 4: Batch validate stock and fetch prices in parallel (optimize API calls)
    let stockValidation = { isValid: true, errors: [], validationResults: [] };
    let latestPrices = new Map();

    if (standardItems.length > 0) {
      console.log("📊 Batch validating stock and fetching prices...");

      // Run validation and price fetching in parallel to reduce API calls
      const [stockResult, pricesResult] = await Promise.all([
        validateStockAvailability(standardItems),
        fetchLatestPrices(standardItems.map((item) => item.productId)),
      ]);

      stockValidation = stockResult;
      latestPrices = pricesResult;

      if (!stockValidation.isValid) {
        console.error("❌ Stock validation failed:", stockValidation.errors);
        return {
          success: false,
          error: `Stock validation failed: ${stockValidation.errors.join(
            ", "
          )}`,
          data: { validationResults: stockValidation.validationResults },
        };
      }

      console.log("✅ Stock validated and prices fetched successfully");
    }

    const billId = Buffer.from(Date.now().toString() + Math.random().toString())
      .toString("base64")
      .substring(0, 12);
    const billNumber = `BILL-${new Date().getFullYear()}-${String(
      Date.now()
    ).slice(-6)}`;

    // Step 6: Prepare final items array for Sanity, including both standard and custom items
    const finalItems = deduplicatedItems.map((item) => {
      const priceInfo = item.productId
        ? latestPrices.get(item.productId)
        : null;
      const unitPrice = item.unitPrice || priceInfo?.sellingPrice || 0;

      const sanityItem: any = {
        productName: item.productName,
        category: item.category || "",
        brand: item.brand || "",
        specifications: item.specifications || "",
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: item.quantity * unitPrice,
        unit: item.unit || priceInfo?.unit || "pcs",
      };

      if (item.productId) {
        sanityItem.product = { _type: "reference", _ref: item.productId };
      }

      return sanityItem;
    });

    // Calculate totals from the final prepared items
    const subtotal = finalItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const homeVisitFee = Number(
      billData.locationType !== "shop" ? billData.homeVisitFee || 0 : 0
    );
    const repairCharges = Number(
      billData.serviceType === "repair" ? billData.repairCharges || 0 : 0
    );
    const laborCharges = Number(billData.laborCharges || 0);
    const totalAmount =
      Number(subtotal) + homeVisitFee + repairCharges + laborCharges;

    const newBill = {
      _type: "bill",
      billId,
      billNumber,
      customer: { _type: "reference", _ref: billData.customerId },
      serviceType: billData.serviceType,
      locationType: billData.locationType,
      items: finalItems,
      serviceDate: new Date().toISOString(),
      homeVisitFee,
      repairCharges,
      laborCharges,
      subtotal,
      totalAmount,
      paymentStatus: "pending",
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: "draft",
      priority: "medium",
      notes: billData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Step 7: Create bill with atomic stock updates (single transaction)
    console.log("🚀 Creating bill with atomic stock updates...");

    try {
      // Use Sanity transaction for atomic operations
      const transaction = sanityClient.transaction();

      // Create the bill
      const result = await transaction.create(newBill).commit();
      console.log("✅ Bill created successfully:", result._id);

      // Step 8: Update stock levels in background (non-blocking)
      if (standardItems.length > 0) {
        // Run stock updates asynchronously to not block the response
        updateStockForBill(standardItems, result._id, "reduce")
          .then((stockUpdateResult) => {
            if (stockUpdateResult.success) {
              console.log("✅ Stock updated successfully in background");
            } else {
              console.warn(
                "⚠️ Background stock update failed:",
                stockUpdateResult.errors
              );
            }
          })
          .catch((error) => {
            console.error("❌ Background stock update error:", error);
          });
      }

      return {
        success: true,
        data: {
          ...result,
          billNumber,
          totalAmount,
        },
        message: `Bill ${billNumber} has been created successfully! Total: ₹${totalAmount}`,
      };
    } catch (transactionError) {
      console.error("❌ Failed to create bill transaction:", transactionError);
      return {
        success: false,
        error:
          transactionError instanceof Error
            ? transactionError.message
            : "Failed to create bill",
      };
    }
  } catch (error) {
    console.error("❌ Failed to create bill:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create bill",
    };
  }
}

/**
 * Update stock transaction in Sanity
 */
export async function createStockTransaction(transactionData: {
  productId: string;
  type: "purchase" | "sale" | "adjustment" | "return" | "damage";
  quantity: number;
  unitPrice: number;
  notes?: string;
  billId?: string;
}): Promise<FormSubmissionResult> {
  try {
    console.log("📊 Creating stock transaction in Sanity:", transactionData);

    const transactionId = Buffer.from(
      Date.now().toString() + Math.random().toString()
    )
      .toString("base64")
      .substring(0, 12);

    const newTransaction = {
      _type: "stockTransaction",
      transactionId,
      type: transactionData.type,
      product: { _type: "reference", _ref: transactionData.productId },
      quantity: transactionData.quantity,
      unitPrice: transactionData.unitPrice,
      totalAmount: transactionData.quantity * transactionData.unitPrice,
      bill: transactionData.billId
        ? { _type: "reference", _ref: transactionData.billId }
        : undefined,
      notes: transactionData.notes,
      status: "completed",
      transactionDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const result = await sanityClient.create(newTransaction);

    // Update product inventory
    if (transactionData.type === "sale" || transactionData.type === "damage") {
      // Decrease stock
      await sanityClient
        .patch(transactionData.productId)
        .dec({ "inventory.currentStock": transactionData.quantity })
        .set({ updatedAt: new Date().toISOString() })
        .commit();
    } else if (
      transactionData.type === "purchase" ||
      transactionData.type === "return"
    ) {
      // Increase stock
      await sanityClient
        .patch(transactionData.productId)
        .inc({ "inventory.currentStock": transactionData.quantity })
        .set({ updatedAt: new Date().toISOString() })
        .commit();
    }

    console.log("✅ Stock transaction created successfully:", result._id);

    return {
      success: true,
      data: result,
      message: `Stock transaction recorded successfully!`,
    };
  } catch (error) {
    console.error("❌ Failed to create stock transaction:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create stock transaction",
    };
  }
}
