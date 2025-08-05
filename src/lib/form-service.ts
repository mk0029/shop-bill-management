import { sanityClient } from "./sanity";

export interface FormSubmissionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface ConfirmationData {
  title: string;
  message: string;
  data: any;
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
    if (productData.categoryId && productData.categoryId.length > 10) {
      // This looks like a Sanity document ID
      categoryReference = { _type: "reference", _ref: productData.categoryId };
    } else {
      // This is a category name, try to find or create the category
      const categoryQuery = `*[_type == "category" && name match "${productData.categoryId}*"][0]._id`;
      let categoryId = await sanityClient.fetch(categoryQuery);

      if (!categoryId) {
        // Create the category if it doesn't exist
        const newCategory = await sanityClient.create({
          _type: "category",
          name: productData.categoryId,
          slug: {
            current: productData.categoryId.toLowerCase().replace(/\s+/g, "-"),
          },
          isActive: true,
          sortOrder: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        categoryId = newCategory._id;
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
    productId: string;
    quantity: number;
    unitPrice: number;
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

    const billId = Buffer.from(Date.now().toString() + Math.random().toString())
      .toString("base64")
      .substring(0, 12);
    const billNumber = `BILL-${new Date().getFullYear()}-${String(
      Date.now()
    ).slice(-6)}`;

    // Calculate totals
    const subtotal = billData.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const homeVisitFee =
      billData.locationType !== "shop" ? billData.homeVisitFee || 0 : 0;
    const repairCharges =
      billData.serviceType === "repair" ? billData.repairCharges || 0 : 0;
    const laborCharges = billData.laborCharges || 0;
    const totalAmount = subtotal + homeVisitFee + repairCharges + laborCharges;

    const newBill = {
      _type: "bill",
      billId,
      billNumber,
      customer: { _type: "reference", _ref: billData.customerId },
      serviceType: billData.serviceType,
      locationType: billData.locationType,
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

    const result = await sanityClient.create(newBill);

    // Create bill items
    const billItems = await Promise.all(
      billData.items.map(async (item) => {
        const billItem = {
          _type: "billItem",
          bill: { _type: "reference", _ref: result._id },
          product: { _type: "reference", _ref: item.productId },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return await sanityClient.create(billItem);
      })
    );

    console.log("✅ Bill created successfully:", result._id);

    return {
      success: true,
      data: {
        ...result,
        items: billItems,
        billNumber,
        totalAmount,
      },
      message: `Bill ${billNumber} has been created successfully! Total: ₹${totalAmount}`,
    };
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
