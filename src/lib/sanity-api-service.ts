import { sanityClient } from "./sanity";
import { strapiService } from "./strapi-service";
import {
  createStockTransactionRecord,
  updateStockTransactionRecord,
  deleteStockTransactionRecord,
} from "./stock-transaction-router";
// Note: Do NOT statically import server-only modules here, this file is used by client code too.
import { getCookie } from "@/lib/cookies";

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Helper: get current actor userId from persisted auth store (client-only)
function getActorUserIdFromPersistedAuth(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getCookie("auth-storage");
    if (!raw) return null;
    let parsedUnknown: unknown = null;
    try { parsedUnknown = JSON.parse(raw); } catch { parsedUnknown = null; }
    const parsed = typeof parsedUnknown === 'object' && parsedUnknown !== null ? parsedUnknown as { state?: { user?: any } } : undefined;
    const user = parsed?.state?.user as any;
    return (user?.id as string) || (user?._id as string) || null;
  } catch {
    return null;
  }
}

// User API Service
export const userApiService = {
  /**
   * Get all users
   */
  async getAllUsers(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "user"] {
        _id,
        clerkId,
        customerId,
        secretKey,
        name,
        nickname,
        email,
        phone,
        location,
        role,
        isActive,
        createdAt,
        updatedAt
      } | order(name asc)`;

      const users = await sanityClient.fetch(query);
      return { success: true, data: users };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: 'Failed to fetch users' };
    }
  },

  /**
   * Get customers only
   */
  async getCustomers(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "user" && role == "customer"] {
        _id,
        clerkId,
        customerId,
        secretKey,
        name,
        nickname,
        email,
        phone,
        location,
        role,
        isActive,
        createdAt,
        updatedAt
      } | order(name asc)`;

      const customers = await sanityClient.fetch(query);
      return { success: true, data: customers };
    } catch (error) {
      console.error('Error fetching customers:', error);
      return { success: false, error: 'Failed to fetch customers' };
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "user" && _id == $userId][0] {
        _id,
        clerkId,
        customerId,
        secretKey,
        name,
        nickname,
        email,
        phone,
        location,
        role,
        isActive,
        createdAt,
        updatedAt
      }`;

      const user = await sanityClient.fetch(query, { userId });
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      return { success: true, data: user };
    } catch (error) {
      console.error('Error fetching user:', error);
      return { success: false, error: 'Failed to fetch user' };
    }
  },

  /**
   * Get user by customerId
   */
  async getUserByCustomerId(customerId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "user" && customerId == $customerId][0] {
        _id,
        clerkId,
        customerId,
        secretKey,
        name,
        nickname,
        email,
        phone,
        location,
        role,
        isActive,
        createdAt,
        updatedAt
      }`;

      const user = await sanityClient.fetch(query, { customerId });
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      return { success: true, data: user };
    } catch (error) {
      console.error('Error fetching user:', error);
      return { success: false, error: 'Failed to fetch user' };
    }
  },

  /**
   * Create new user
   */
  async createUser(userData: {
    name: string;
    nickname?: string;
    email?: string;
    phone: string;
    location: string;
    role: 'admin' | 'customer';
  }): Promise<ApiResponse<any>> {
    try {
      // Format phone number
      const formattedPhone = userData.phone.startsWith('+91')
        ? userData.phone
        : `+91${userData.phone.replace(/\s/g, '')}`;

      // Generate credentials
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

      const newUser = {
        _type: "user",
        clerkId: `user_${Date.now()}`,
        customerId,
        secretKey,
        name: userData.name,
        nickname: userData.nickname?.trim() || undefined,
        email: userData.email,
        phone: formattedPhone, // Use formatted phone number
        location: userData.location,
        role: userData.role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdResult = await fetch('/api/mutations/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { ...newUser, role: userData.role, _type: 'user' } }),
      });
      const createdJson = await createdResult.json().catch(() => ({}));
      if (!createdResult.ok || !createdJson?.success) {
        return { success: false, error: createdJson?.error || 'Failed to create user' };
      }
      const createdUser = createdJson.data;

      // Send secret key via WhatsApp (placeholder)

      // Sync to Strapi in background (non-blocking)
      strapiService.sync
        .syncUserToStrapi(createdUser)
        .then(() => {
        })
        .catch((strapiError) => {
          console.warn("⚠️ Failed to sync user to Strapi:", strapiError);
        });

      // Note: admin notifications moved to dedicated server handlers (API/cron)

      return { success: true, data: createdUser };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'Failed to create user' };
    }
  },

  /**
   * Update user
   */
  async updateUser(
    userId: string,
    userData: Partial<{
      name: string;
      nickname: string;
      email: string;
      phone: string;
      location: string;
      isActive: boolean;
    }>
  ): Promise<ApiResponse<any>> {
    try {
      const res = await fetch('/api/mutations/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates: userData }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error || 'Failed to update user' };
      }
      const updatedUser = json.data;

      // Sync to Strapi
      try {
        await strapiService.sync.syncUserToStrapi(updatedUser);
      } catch (strapiError) {
        console.warn('Failed to sync user to Strapi:', strapiError);
      }

      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: 'Failed to update user' };
    }
  },

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    try {
      const res = await fetch('/api/mutations/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error || 'Failed to delete user' };
      }
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: 'Failed to delete user' };
    }
  },

  /**
   * Login user with phone and secret key
   */
  async loginUser(credentials: { phone: string; secretKey: string }): Promise<ApiResponse<any>> {
    try {
      const { phone, secretKey } = credentials;
      const query = `*[_type == "user" && (phone == $phone || phone == $prefixedPhone) && secretKey == $secretKey][0] {
        _id,
        clerkId,
        customerId,
        name,
        email,
        phone,
        location,
        role,
        isActive,
        createdAt,
        updatedAt
      }`;

      const user = await sanityClient.fetch(query, {
        phone,
        prefixedPhone: `+91${phone}`,
        secretKey,
      });

      if (!user) {
        return { success: false, error: 'Invalid phone number or secret key' };
      }

      if (!user.isActive) {
        return { success: false, error: 'User account is inactive' };
      }

      return { success: true, data: user };
    } catch (error) {
      console.error('Error logging in user:', error);
      return { success: false, error: 'Failed to login' };
    }
  },
};

// Product API Service
export const productApiService = {
  /**
   * Get all products
   */
  async getAllProducts(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "product"] {
        ...,
        brand->{
          _id,
          _type,
          "name": select(
            defined(name) => name,
            defined(title) => title,
            "Unnamed Brand"
          ),
          slug,
          logo,
          description,
          "isActive": select(
            defined(isActive) => isActive,
            true
          )
        },
        category->{
          _id,
          _type,
          name,
          slug,
          description,
          icon,
          "isActive": select(
            defined(isActive) => isActive,
            true
          )
        }
      } | order(name asc)`;

      const products = await sanityClient.fetch(query);
      return { success: true, data: products };
    } catch (error) {
      console.error('Error fetching products:', error);
      return { success: false, error: 'Failed to fetch products' };
    }
  },

  /**
   * Get active products only
   */
  async getActiveProducts(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "product" && isActive == true] {
        ...,
        brand->{
          _id,
          _type,
          "name": select(
            defined(name) => name,
            defined(title) => title,
            "Unnamed Brand"
          ),
          slug,
          logo,
          description,
          "isActive": select(
            defined(isActive) => isActive,
            true
          )
        },
        category->{
          _id,
          _type,
          name,
          slug,
          description,
          icon,
          "isActive": select(
            defined(isActive) => isActive,
            true
          )
        }
      } | order(name asc)`;

      const products = await sanityClient.fetch(query);
      return { success: true, data: products };
    } catch (error) {
      console.error('Error fetching active products:', error);
      return { success: false, error: 'Failed to fetch active products' };
    }
  },

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "product" && _id == $productId][0] {
        ...,
        brand->{
          _id,
          _type,
          "name": select(
            defined(name) => name,
            defined(title) => title,
            "Unnamed Brand"
          ),
          slug,
          logo,
          description,
          "isActive": select(
            defined(isActive) => isActive,
            true
          )
        },
        category->{
          _id,
          _type,
          name,
          slug,
          description,
          icon,
          "isActive": select(
            defined(isActive) => isActive,
            true
          )
        }
      }`;

      const product = await sanityClient.fetch(query, { productId });
      if (!product) {
        return { success: false, error: 'Product not found' };
      }
      return { success: true, data: product };
    } catch (error) {
      console.error('Error fetching product:', error);
      return { success: false, error: 'Failed to fetch product' };
    }
  },

  /**
   * Create new product
   */
  async createProduct(productData: any): Promise<ApiResponse<any>> {
    try {
      const newProduct = {
        _type: "product",
        productId: `PROD_${Date.now()}`,
        ...productData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdProduct = await sanityClient.create(newProduct);

      // Sync to Strapi
      try {
        await strapiService.products.createProduct(createdProduct);
      } catch (strapiError) {
        console.warn('Failed to sync product to Strapi:', strapiError);
      }

      return { success: true, data: createdProduct };
    } catch (error) {
      console.error('Error creating product:', error);
      return { success: false, error: 'Failed to create product' };
    }
  },

  /**
   * Update product
   */
  async updateProduct(
    productId: string, // This is Sanity's _id
    productData: any
  ): Promise<ApiResponse<any>> {
    try {
      const updatedProduct = await sanityClient
        .patch(productId)
        .set({
          ...productData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Sync to Strapi
      try {
        // First, find the product in Strapi by its Sanity ID to get the numeric Strapi ID
        const strapiProduct = await strapiService.products.getProductBySanityId(updatedProduct.productId);
        if (strapiProduct) {
          await strapiService.products.updateProduct(strapiProduct.id, updatedProduct);
        } else {
          // If it doesn't exist in Strapi, maybe we should create it?
          await strapiService.products.createProduct(updatedProduct);
        }
      } catch (strapiError) {
        console.warn('Failed to sync product to Strapi:', strapiError);
      }

      return { success: true, data: updatedProduct };
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, error: 'Failed to update product' };
    }
  },

  /**
   * Delete product
   */
  async deleteProduct(productId: string): Promise<ApiResponse<void>> {
    try {
      await sanityClient.delete(productId);
      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: 'Failed to delete product' };
    }
  },
};

// Brand API Service
export const brandApiService = {
  async getAllBrands(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "brand"]{ _id, _type, "name": select(defined(name)=>name, defined(title)=>title, "Unnamed Brand"), slug, logo, description, "isActive": select(defined(isActive)=>isActive, true) } | order(name asc)`;
      const brands = await sanityClient.fetch(query);
      return { success: true, data: brands };
    } catch (error) {
      console.error('Error fetching brands:', error);
      return { success: false, error: 'Failed to fetch brands' };
    }
  },
  async getBrandById(brandId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "brand" && _id == $brandId][0]{ _id, _type, "name": select(defined(name)=>name, defined(title)=>title, "Unnamed Brand"), slug, logo, description, "isActive": select(defined(isActive)=>isActive, true) }`;
      const brand = await sanityClient.fetch(query, { brandId });
      if (!brand) return { success: false, error: 'Brand not found' };
      return { success: true, data: brand };
    } catch (error) {
      console.error('Error fetching brand:', error);
      return { success: false, error: 'Failed to fetch brand' };
    }
  },
  async createBrand(brandData: any): Promise<ApiResponse<any>> {
    try {
      const newBrand = {
        _type: "brand",
        ...brandData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const created = await sanityClient.create(newBrand);
      return { success: true, data: created };
    } catch (error) {
      console.error('Error creating brand:', error);
      return { success: false, error: 'Failed to create brand' };
    }
  },
  async updateBrand(brandId: string, brandData: any): Promise<ApiResponse<any>> {
    try {
      const updated = await sanityClient
        .patch(brandId)
        .set({ ...brandData, updatedAt: new Date().toISOString() })
        .commit();
      return { success: true, data: updated };
    } catch (error) {
      console.error('Error updating brand:', error);
      return { success: false, error: 'Failed to update brand' };
    }
  },
  async deleteBrand(brandId: string): Promise<ApiResponse<void>> {
    try {
      await sanityClient.delete(brandId);
      return { success: true, message: 'Brand deleted successfully' };
    } catch (error) {
      console.error('Error deleting brand:', error);
      return { success: false, error: 'Failed to delete brand' };
    }
  },
};

// Category API Service
export const categoryApiService = {

  async getAllCategories(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "category"]{ _id, _type, name, slug, description, icon, "isActive": select(defined(isActive)=>isActive, true) } | order(name asc)`;
      const categories = await sanityClient.fetch(query);
      return { success: true, data: categories };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { success: false, error: 'Failed to fetch categories' };
    }
  },
  async getCategoryById(categoryId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "category" && _id == $categoryId][0]{ _id, _type, name, slug, description, icon, "isActive": select(defined(isActive)=>isActive, true) }`;
      const category = await sanityClient.fetch(query, { categoryId });
      if (!category) return { success: false, error: 'Category not found' };
      return { success: true, data: category };
    } catch (error) {
      console.error('Error fetching category:', error);
      return { success: false, error: 'Failed to fetch category' };
    }
  },
  async createCategory(categoryData: any): Promise<ApiResponse<any>> {
    try {
      const newCategory = {
        _type: "category",
        ...categoryData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const created = await sanityClient.create(newCategory);
      return { success: true, data: created };
    } catch (error) {
      console.error('Error creating category:', error);
      return { success: false, error: 'Failed to create category' };
    }
  },
  async updateCategory(categoryId: string, categoryData: any): Promise<ApiResponse<any>> {
    try {
      const updated = await sanityClient
        .patch(categoryId)
        .set({ ...categoryData, updatedAt: new Date().toISOString() })
        .commit();
      return { success: true, data: updated };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: 'Failed to update category' };
    }
  },
  async deleteCategory(categoryId: string): Promise<ApiResponse<void>> {
    try {
      await sanityClient.delete(categoryId);
      return { success: true, message: 'Category deleted successfully' };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: 'Failed to delete category' };
    }
  },
};

// Bill API Service
export const billApiService = {
  async getAllBills(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "bill"] {
        ...,
        "discount": coalesce(discount, discountAmount, 0),
        customer->{
          _id,
          name,
          phone,
          email,
          location,
          role
        },
        customerAddress->{
          _id,
          addressType,
          addressObject
        },
        technician->{
          _id,
          name,
          phone,
          email
        }
      } | order(createdAt desc)`;

      const bills = await sanityClient.fetch(query);
      return { success: true, data: bills };
    } catch (error) {
      console.error('Error fetching bills:', error);
      return { success: false, error: 'Failed to fetch bills' };
    }
  },

  async getBillById(billId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "bill" && _id == $billId][0] {
        ...,
        "discount": coalesce(discount, discountAmount, 0),
        customer->{
          _id,
          name,
          phone,
          email,
          location,
          role
        },
        customerAddress->{
          _id,
          addressType,
          addressObject
        },
        technician->{
          _id,
          name,
          phone,
          email
        },
        "billItems": *[_type == "billItem" && bill._ref == ^._id] {
          _id,
          product->{
            _id,
            name,
            productId,
            pricing
          },
          quantity,
          unitPrice,
          discount,
          totalPrice
        }
      }`;

      const bill = await sanityClient.fetch(query, { billId });
      if (!bill) {
        return { success: false, error: 'Bill not found' };
      }
      return { success: true, data: bill };
    } catch (error) {
      console.error('Error fetching bill:', error);
      return { success: false, error: 'Failed to fetch bill' };
    }
  },

  async getCustomerBills(customerId: string): Promise<ApiResponse<any[]>> {
    try {
      // Federated read: primary (legacy bills) + billing DB (new bills)
      const res = await fetch(
        `/api/bills/federated?customerId=${encodeURIComponent(customerId)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!json?.success) {
        return { success: false, error: json?.error || "Failed to fetch customer bills" };
      }
      return { success: true, data: Array.isArray(json.data) ? json.data : [] };
    } catch (error) {
      console.error('Error fetching customer bills:', error);
      return { success: false, error: 'Failed to fetch customer bills' };
    }
  },

  async createBill(billData: any): Promise<ApiResponse<any>> {
    try {
      const newBill = {
        _type: "bill",
        billNumber: `BILL_${Date.now()}`,
        ...billData,
        status: 'draft',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const actorUserId = getActorUserIdFromPersistedAuth() || undefined;
      const res = await fetch("/api/mutations/bills/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bill: newBill, actorUserId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        return {
          success: false,
          error: json?.error || `Failed to create bill (${res.status})`,
        };
      }
      const createdBill = (json?.data || {}) as any;

      // Sync to Strapi
      try {
        await strapiService.bills.createBill(createdBill);
      } catch (strapiError) {
        console.warn('Failed to sync bill to Strapi:', strapiError);
      }

      // Mark this bill as recently created in this session to suppress local self-toasts
      try {
        if (typeof window !== "undefined") {
          const key = "recentCreatedBillIds";
          const arr = JSON.parse(window.sessionStorage.getItem(key) || "[]");
          const next = [{ id: String((createdBill as any)?._id), t: Date.now() }, ...arr].slice(0, 20);
          window.sessionStorage.setItem(key, JSON.stringify(next));
        }
      } catch {}

      return { success: true, data: createdBill };
    } catch (error) {
      console.error('Error creating bill:', error);
      return { success: false, error: 'Failed to create bill' };
    }
  },

  async updateBill(
    billId: string,
    billData: any
  ): Promise<ApiResponse<any>> {
    try {
      const res = await fetch(`/api/bills/${encodeURIComponent(billId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billData || {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        return {
          success: false,
          error: json?.error || `Failed to update bill (${res.status})`,
        };
      }
      const updatedBill = (json?.data || {}) as any;

      // Mark this bill as recently updated in this session to suppress local self-toasts
      try {
        if (typeof window !== "undefined") {
          const key = "recentUpdatedBillIds";
          const arr = JSON.parse(window.sessionStorage.getItem(key) || "[]");
          const next = [{ id: String((updatedBill as any)?._id ?? billId), t: Date.now() }, ...arr].slice(0, 20);
          window.sessionStorage.setItem(key, JSON.stringify(next));
        }
      } catch {}

      return { success: true, data: updatedBill };
    } catch (error) {
      console.error('Error updating bill:', error);
      return { success: false, error: 'Failed to update bill' };
    }
  },

  async deleteBill(billId: string): Promise<ApiResponse<void>> {
    try {
      // Client: call secure API route so server token is used
      if (typeof window !== "undefined") {
        const res = await fetch(`/api/bills/${encodeURIComponent(billId)}`, {
          method: "DELETE",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || (json && json.success === false)) {
          return {
            success: false,
            error: (json && json.error) || `Failed to delete bill (${res.status})`,
          };
        }
        return { success: true, message: 'Bill deleted successfully' };
      }

      // Server: delete directly
      await sanityClient.delete(billId);
      return { success: true, message: 'Bill deleted successfully' };
    } catch (error) {
      console.error('Error deleting bill:', error);
      return { success: false, error: 'Failed to delete bill' };
    }
  },
};

// Stock Transaction API Service
export const stockTransactionApiService = {
  /**
   * Get all stock transactions
   */
  async getAllStockTransactions(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "stockTransaction"] {
        ...,
        product->{
          _id,
          name,
          productId,
          pricing,
          inventory
        },
        supplier->{
          _id,
          name,
          contactInfo
        }
      } | order(transactionDate desc)`;

      const transactions = await sanityClient.fetch(query);
      return { success: true, data: transactions };
    } catch (error) {
      console.error('Error fetching stock transactions:', error);
      return { success: false, error: 'Failed to fetch stock transactions' };
    }
  },

  /**
   * Get stock transaction by ID
   */
  async getStockTransactionById(transactionId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "stockTransaction" && _id == $transactionId][0] {
        ...,
        product->{
          _id,
          name,
          productId,
          pricing,
          inventory
        },
        supplier->{
          _id,
          name,
          contactInfo
        }
      }`;

      const transaction = await sanityClient.fetch(query, { transactionId });
      if (!transaction) {
        return { success: false, error: 'Stock transaction not found' };
      }
      return { success: true, data: transaction };
    } catch (error) {
      console.error('Error fetching stock transaction:', error);
      return { success: false, error: 'Failed to fetch stock transaction' };
    }
  },

  /**
   * Create new stock transaction
   */
  async createStockTransaction(transactionData: any): Promise<ApiResponse<any>> {
    try {
      const newTransaction = {
        _type: "stockTransaction",
        ...transactionData,
        transactionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const txResult = await createStockTransactionRecord(newTransaction);
      if (!txResult.success) {
        return {
          success: false,
          error: txResult.error || "Failed to create stock transaction",
        };
      }
      const createdTransaction = { _id: txResult.id, ...newTransaction };

      // Sync to Strapi
      try {
        await strapiService.stock.createStockTransaction(createdTransaction);
      } catch (strapiError) {
        console.warn('Failed to sync stock transaction to Strapi:', strapiError);
      }

      return { success: true, data: createdTransaction };
    } catch (error) {
      console.error('Error creating stock transaction:', error);
      return { success: false, error: 'Failed to create stock transaction' };
    }
  },

  /**
   * Update stock transaction
   */
  async updateStockTransaction(
    transactionId: string,
    transactionData: any
  ): Promise<ApiResponse<any>> {
    try {
      const txResult = await updateStockTransactionRecord(transactionId, {
        ...transactionData,
        updatedAt: new Date().toISOString(),
      });
      if (!txResult.success) {
        return {
          success: false,
          error: txResult.error || "Failed to update stock transaction",
        };
      }
      const updatedTransaction = { _id: transactionId, ...transactionData };

      // Sync to Strapi
      try {
        await strapiService.stock.createStockTransaction(updatedTransaction);
      } catch (strapiError) {
        console.warn('Failed to sync stock transaction to Strapi:', strapiError);
      }

      return { success: true, data: updatedTransaction };
    } catch (error) {
      console.error('Error updating stock transaction:', error);
      return { success: false, error: 'Failed to update stock transaction' };
    }
  },

  /**
   * Delete stock transaction
   */
  async deleteStockTransaction(transactionId: string): Promise<ApiResponse<void>> {
    try {
      const txResult = await deleteStockTransactionRecord(transactionId);
      if (!txResult.success) {
        return {
          success: false,
          error: txResult.error || "Failed to delete stock transaction",
        };
      }
      return { success: true, message: 'Stock transaction deleted successfully' };
    } catch (error) {
      console.error('Error deleting stock transaction:', error);
      return { success: false, error: 'Failed to delete stock transaction' };
    }
  },
};

// Payment API Service
export const paymentApiService = {
  /**
   * Get all payments
   */
  async getAllPayments(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "payment"] {
        ...,
        bill->{
          _id,
          billNumber,
          customer->{
            _id,
            name,
            phone
          }
        }
      } | order(paymentDate desc)`;

      const payments = await sanityClient.fetch(query);
      return { success: true, data: payments };
    } catch (error) {
      console.error('Error fetching payments:', error);
      return { success: false, error: 'Failed to fetch payments' };
    }
  },

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "payment" && _id == $paymentId][0] {
        ...,
        bill->{
          _id,
          billNumber,
          customer->{
            _id,
            name,
            phone
          }
        }
      }`;

      const payment = await sanityClient.fetch(query, { paymentId });
      if (!payment) {
        return { success: false, error: 'Payment not found' };
      }
      return { success: true, data: payment };
    } catch (error) {
      console.error('Error fetching payment:', error);
      return { success: false, error: 'Failed to fetch payment' };
    }
  },

  /**
   * Create new payment
   */
  async createPayment(paymentData: any): Promise<ApiResponse<any>> {
    try {
      const newPayment = {
        _type: "payment",
        ...paymentData,
        paymentDate: new Date().toISOString(),
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdPayment = await sanityClient.create(newPayment);

      // Sync to Strapi
      try {
        await strapiService.payments.createPayment(createdPayment);
      } catch (strapiError) {
        console.warn('Failed to sync payment to Strapi:', strapiError);
      }

      return { success: true, data: createdPayment };
    } catch (error) {
      console.error('Error creating payment:', error);
      return { success: false, error: 'Failed to create payment' };
    }
  },

  /**
   * Update payment
   */
  async updatePayment(
    paymentId: string,
    paymentData: any
  ): Promise<ApiResponse<any>> {
    try {
      const updatedPayment = await sanityClient
        .patch(paymentId)
        .set({
          ...paymentData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Sync to Strapi
      try {
        await strapiService.payments.createPayment(updatedPayment);
      } catch (strapiError) {
        console.warn('Failed to sync payment to Strapi:', strapiError);
      }

      return { success: true, data: updatedPayment };
    } catch (error) {
      console.error('Error updating payment:', error);
      return { success: false, error: 'Failed to update payment' };
    }
  },

  /**
   * Delete payment
   */
  async deletePayment(paymentId: string): Promise<ApiResponse<void>> {
    try {
      await sanityClient.delete(paymentId);
      return { success: true, message: 'Payment deleted successfully' };
    } catch (error) {
      console.error('Error deleting payment:', error);
      return { success: false, error: 'Failed to delete payment' };
    }
  },
};

// Address API Service
export const addressApiService = {
  /**
   * Get all addresses
   */
  async getAllAddresses(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "address"] {
        ...,
        customer->{
          _id,
          name,
          phone,
          email
        }
      } | order(createdAt desc)`;

      const addresses = await sanityClient.fetch(query);
      return { success: true, data: addresses };
    } catch (error) {
      console.error('Error fetching addresses:', error);
      return { success: false, error: 'Failed to fetch addresses' };
    }
  },

  /**
   * Get addresses for specific customer
   */
  async getCustomerAddresses(customerId: string): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "address" && customer._ref == $customerId] {
        ...,
        customer->{
          _id,
          name,
          phone,
          email
        }
      } | order(createdAt desc)`;

      const addresses = await sanityClient.fetch(query, { customerId });
      return { success: true, data: addresses };
    } catch (error) {
      console.error('Error fetching customer addresses:', error);
      return { success: false, error: 'Failed to fetch customer addresses' };
    }
  },

  /**
   * Create new address
   */
  async createAddress(addressData: any): Promise<ApiResponse<any>> {
    try {
      const newAddress = {
        _type: "address",
        ...addressData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdAddress = await sanityClient.create(newAddress);

      // Sync to Strapi
      try {
        await strapiService.addresses.createAddress(createdAddress);
      } catch (strapiError) {
        console.warn('Failed to sync address to Strapi:', strapiError);
      }

      return { success: true, data: createdAddress };
    } catch (error) {
      console.error('Error creating address:', error);
      return { success: false, error: 'Failed to create address' };
    }
  },

  /**
   * Update address
   */
  async updateAddress(
    addressId: string,
    addressData: any
  ): Promise<ApiResponse<any>> {
    try {
      const updatedAddress = await sanityClient
        .patch(addressId)
        .set({
          ...addressData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Sync to Strapi
      try {
        await strapiService.addresses.createAddress(updatedAddress);
      } catch (strapiError) {
        console.warn('Failed to sync address to Strapi:', strapiError);
      }

      return { success: true, data: updatedAddress };
    } catch (error) {
      console.error('Error updating address:', error);
      return { success: false, error: 'Failed to update address' };
    }
  },

  /**
   * Delete address
   */
  async deleteAddress(addressId: string): Promise<ApiResponse<void>> {
    try {
      await sanityClient.delete(addressId);
      return { success: true, message: 'Address deleted successfully' };
    } catch (error) {
      console.error('Error deleting address:', error);
      return { success: false, error: 'Failed to delete address' };
    }
  },
};

// Follow-up API Service
export const followUpApiService = {
  /**
   * Get all follow-ups
   */
  async getAllFollowUps(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "followUp"] {
        ...,
        customer->{
          _id,
          name,
          phone,
          email
        },
        bill->{
          _id,
          billNumber,
          totalAmount
        }
      } | order(scheduledDate asc)`;

      const followUps = await sanityClient.fetch(query);
      return { success: true, data: followUps };
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
      return { success: false, error: 'Failed to fetch follow-ups' };
    }
  },

  /**
   * Get follow-up by ID
   */
  async getFollowUpById(followUpId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "followUp" && _id == $followUpId][0] {
        ...,
        customer->{
          _id,
          name,
          phone,
          email
        },
        bill->{
          _id,
          billNumber,
          totalAmount
        }
      }`;

      const followUp = await sanityClient.fetch(query, { followUpId });
      if (!followUp) {
        return { success: false, error: 'Follow-up not found' };
      }
      return { success: true, data: followUp };
    } catch (error) {
      console.error('Error fetching follow-up:', error);
      return { success: false, error: 'Failed to fetch follow-up' };
    }
  },

  /**
   * Create new follow-up
   */
  async createFollowUp(followUpData: any): Promise<ApiResponse<any>> {
    try {
      const newFollowUp = {
        _type: "followUp",
        ...followUpData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdFollowUp = await sanityClient.create(newFollowUp);

      // Sync to Strapi
      try {
        await strapiService.followUps.createFollowUp(createdFollowUp);
      } catch (strapiError) {
        console.warn('Failed to sync follow-up to Strapi:', strapiError);
      }

      return { success: true, data: createdFollowUp };
    } catch (error) {
      console.error('Error creating follow-up:', error);
      return { success: false, error: 'Failed to create follow-up' };
    }
  },

  /**
   * Update follow-up
   */
  async updateFollowUp(
    followUpId: string,
    followUpData: any
  ): Promise<ApiResponse<any>> {
    try {
      const updatedFollowUp = await sanityClient
        .patch(followUpId)
        .set({
          ...followUpData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Sync to Strapi
      try {
        await strapiService.followUps.createFollowUp(updatedFollowUp);
      } catch (strapiError) {
        console.warn('Failed to sync follow-up to Strapi:', strapiError);
      }

      return { success: true, data: updatedFollowUp };
    } catch (error) {
      console.error('Error updating follow-up:', error);
      return { success: false, error: 'Failed to update follow-up' };
    }
  },

  /**
   * Delete follow-up
   */
  async deleteFollowUp(followUpId: string): Promise<ApiResponse<void>> {
    try {
      await sanityClient.delete(followUpId);
      return { success: true, message: 'Follow-up deleted successfully' };
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      return { success: false, error: 'Failed to delete follow-up' };
    }
  },
};

// Supplier API Service
export const supplierApiService = {
  /**
   * Get all suppliers
   */
  async getAllSuppliers(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "supplier"] {
        ...,
        contactInfo,
        address
      } | order(name asc)`;

      const suppliers = await sanityClient.fetch(query);
      return { success: true, data: suppliers };
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return { success: false, error: 'Failed to fetch suppliers' };
    }
  },

  /**
   * Get supplier by ID
   */
  async getSupplierById(supplierId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "supplier" && _id == $supplierId][0] {
        ...,
        contactInfo,
        address
      }`;

      const supplier = await sanityClient.fetch(query, { supplierId });
      if (!supplier) {
        return { success: false, error: 'Supplier not found' };
      }
      return { success: true, data: supplier };
    } catch (error) {
      console.error('Error fetching supplier:', error);
      return { success: false, error: 'Failed to fetch supplier' };
    }
  },

  /**
   * Create new supplier
   */
  async createSupplier(supplierData: any): Promise<ApiResponse<any>> {
    try {
      const newSupplier = {
        _type: "supplier",
        ...supplierData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdSupplier = await sanityClient.create(newSupplier);

      // Sync to Strapi
      try {
        await strapiService.suppliers.createSupplier(createdSupplier);
      } catch (strapiError) {
        console.warn('Failed to sync supplier to Strapi:', strapiError);
      }

      return { success: true, data: createdSupplier };
    } catch (error) {
      console.error('Error creating supplier:', error);
      return { success: false, error: 'Failed to create supplier' };
    }
  },

  /**
   * Update supplier
   */
  async updateSupplier(
    supplierId: string,
    supplierData: any
  ): Promise<ApiResponse<any>> {
    try {
      const updatedSupplier = await sanityClient
        .patch(supplierId)
        .set({
          ...supplierData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Sync to Strapi
      try {
        await strapiService.suppliers.createSupplier(updatedSupplier);
      } catch (strapiError) {
        console.warn('Failed to sync supplier to Strapi:', strapiError);
      }

      return { success: true, data: updatedSupplier };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return { success: false, error: 'Failed to update supplier' };
    }
  },

  /**
   * Delete supplier
   */
  async deleteSupplier(supplierId: string): Promise<ApiResponse<void>> {
    try {
      await sanityClient.delete(supplierId);
      return { success: true, message: 'Supplier deleted successfully' };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return { success: false, error: 'Failed to delete supplier' };
    }
  },
};

// Shop Product API Service
export const shopProductApiService = {
  async getAll(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "shopProduct"] {
        _id,
        name,
        slug,
        shortDescription,
        description,
        category->{ _id, name, slug, image, isActive },
        subcategory->{ _id, name },
        brand,
        images,
        pricing,
        inStock,
        stockCount,
        lowStockThreshold,
        features,
        specifications,
        tags,
        isActive,
        isFeatured,
        isNewArrival,
        seoTitle,
        seoDescription,
        rating,
        reviewCount,
        createdAt
      } | order(createdAt desc)`;
      const data = await sanityClient.fetch(query);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to fetch shop products' };
    }
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "shopProduct" && _id == $id][0] {
        _id, name, slug, shortDescription, description,
        category->{ _id, name, slug, image, isActive },
        subcategory->{ _id, name },
        brand, images, pricing, inStock, stockCount, lowStockThreshold,
        features, specifications, tags, isActive, isFeatured, isNewArrival,
        seoTitle, seoDescription, rating, reviewCount, createdAt
      }`;
      const data = await sanityClient.fetch(query, { id });
      if (!data) return { success: false, error: 'Product not found' };
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to fetch shop product' };
    }
  },

  async create(data: any): Promise<ApiResponse<any>> {
    try {
      const doc = {
        _type: "shopProduct",
        ...data,
        createdAt: new Date().toISOString(),
      };
      const created = await sanityClient.create(doc);
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: 'Failed to create shop product' };
    }
  },

  async update(id: string, data: any): Promise<ApiResponse<any>> {
    try {
      const updated = await sanityClient.createOrReplace({
        _id: id,
        _type: "shopProduct",
        ...data,
      });
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: 'Failed to update shop product' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await sanityClient.delete(id);
      return { success: true, message: 'Shop product deleted' };
    } catch (error) {
      return { success: false, error: 'Failed to delete shop product' };
    }
  },
};

// Shop Category API Service
export const shopCategoryApiService = {
  async getAll(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "shopCategory"] {
        _id, name, slug, description, image, icon, isActive, sortOrder, createdAt,
        "productCount": count(*[_type == "shopProduct" && category._ref == ^._id])
      } | order(sortOrder asc, name asc)`;
      const data = await sanityClient.fetch(query);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to fetch shop categories' };
    }
  },

  async getById(id: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "shopCategory" && _id == $id][0] {
        _id, name, slug, description, image, icon, isActive, sortOrder, createdAt,
        "productCount": count(*[_type == "shopProduct" && category._ref == ^._id])
      }`;
      const data = await sanityClient.fetch(query, { id });
      if (!data) return { success: false, error: 'Category not found' };
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to fetch shop category' };
    }
  },

  async create(data: any): Promise<ApiResponse<any>> {
    try {
      const doc = {
        _type: "shopCategory",
        ...data,
        createdAt: new Date().toISOString(),
      };
      const created = await sanityClient.create(doc);
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: 'Failed to create shop category' };
    }
  },

  async update(id: string, data: any): Promise<ApiResponse<any>> {
    try {
      const updated = await sanityClient.patch(id).set(data).commit();
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: 'Failed to update shop category' };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      await sanityClient.delete(id);
      return { success: true, message: 'Shop category deleted' };
    } catch (error) {
      return { success: false, error: 'Failed to delete shop category' };
    }
  },
};

// Online API Service
export const onlineApiService = {
  /**
   * Get online status
   */
  async getOnlineStatus(): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "online" && _id == "onlineStatus"][0]`;

      const onlineStatus = await sanityClient.fetch(query);
      if (!onlineStatus) {
        return { success: false, error: 'Online status not found' };
      }
      return { success: true, data: onlineStatus };
    } catch (error) {
      console.error('Error fetching online status:', error);
      return { success: false, error: 'Failed to fetch online status' };
    }
  },

  /**
   * Update online status
   */
  async updateOnlineStatus(onlineData: any): Promise<ApiResponse<any>> {
    try {
      // If in browser, call our server API to avoid CORS/token exposure issues
      if (typeof window !== 'undefined') {
        // Try to get current device FCM token to exclude this device from broadcast
        let excludeTokens: string[] | undefined = undefined;
        try {
          const mod: any = await import('@/lib/fcm-client');
          if (typeof mod.getTokenWithoutRegister === 'function') {
            const t = await mod.getTokenWithoutRegister();
            if (t) excludeTokens = [t];
          }
        } catch {}

        const res = await fetch('/api/online', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...onlineData, excludeTokens }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.success === false) {
          return { success: false, error: json?.error || `Failed to update online status (${res.status})` };
        }
        return { success: true, data: json.data };
      }

      // Server-side direct mutation (no notifications here; API route handles broadcast)
      const updatedOnlineStatus = await sanityClient
        .patch('onlineStatus')
        .set({
          ...onlineData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      return { success: true, data: updatedOnlineStatus };
    } catch (error) {
      console.error('Error updating online status:', error);
      return { success: false, error: 'Failed to update online status' };
    }
  },
};

// Cash Book API Service
export function billPaymentNotes(opts: {
  billNumber?: string;
  billCount?: number;
  paymentStatus?: string;
  context?: string;
}): string {
  const { billNumber, billCount, paymentStatus, context } = opts;

  if (context === 'reversal') {
    return billNumber
      ? `Payment reversed due to bill cancellation for Bill ${billNumber}`
      : 'Payment reversed due to bill cancellation';
  }
  if (context === 'refund') {
    return billNumber
      ? `Refund issued for Bill ${billNumber}`
      : 'Refund issued';
  }
  if (context === 'advance') {
    return 'Advance payment received';
  }
  if (billCount && billCount > 1) {
    return `Payment received for ${billCount} bills`;
  }
  if (paymentStatus === 'partial') {
    return billNumber
      ? `Partial payment received for Bill ${billNumber}`
      : 'Partial payment received';
  }
  if (billNumber) {
    return `Payment received for Bill ${billNumber}`;
  }
  return 'Payment received';
}

export const cashBookApiService = {
  /**
   * Get all cash book entries
   */
  async getAllEntries(): Promise<ApiResponse<any[]>> {
    try {
      const res = await fetch('/api/cashbook/entries');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error || 'Failed to fetch cash book entries' };
      }
      return { success: true, data: json?.data };
    } catch (error) {
      console.error('Error fetching cash book entries:', error);
      return { success: false, error: 'Failed to fetch cash book entries' };
    }
  },

  /**
   * Create cash book entry
   */
  async createEntry(entryData: any, options?: { actorUserId?: string }): Promise<ApiResponse<any>> {
    try {

      // If running in the browser, use server API so we can emit notifications.
      if (typeof window !== 'undefined') {
        try {
          const res = await fetch('/api/mutations/cashbook/create-entry', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(options?.actorUserId ? { 'x-user-id': String(options.actorUserId) } : {}),
            },
            body: JSON.stringify({ entry: entryData, ...(options?.actorUserId ? { actorUserId: String(options.actorUserId) } : {}) }),
          })
          const j = await res.json().catch(() => ({}))
          if (res.ok && j?.success) {
            return { success: true, data: j.data }
          }
          // If API rejected, log and fall through to direct Sanity create
          if (j?.error) console.warn('[CashBook] API rejected entry, falling back to direct create:', j.error);
        } catch (e) {
          // fall through to direct Sanity create
        }
      }
      
      const { createDocument } = await import('./sanity/write-router');
      const { denormalizeCashbookEntry } = await import('./sanity/denormalize');
      const newEntry = {
        _type: "cashBookEntry",
        ...entryData,
        // Preserve custom createdAt for bill payment dates, let Sanity handle _createdAt
        createdAt: entryData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // The cashbook lives in its own DB which does not host the referenced
      // user/bill docs, so strip cross-dataset references into plain-string ids
      // (userId/billId) or Sanity rejects the write with
      // "references non-existent document".
      const denormalizedEntry = denormalizeCashbookEntry(newEntry);

      const writeResult = await createDocument(denormalizedEntry as any, 'cashbook');
      if (!writeResult.success) {
        return { success: false, error: writeResult.error || 'Failed to create cash book entry' };
      }

      return { success: true, data: { _id: writeResult.documentId, ...denormalizedEntry } };
    } catch (error) {
      console.error('Error creating cash book entry:', error);
      return { success: false, error: 'Failed to create cash book entry' };
    }
  },

  /**
   * Check if a cash book entry already exists for a bill
   */
  async checkEntryExistsForBill(billId: string): Promise<boolean> {
    try {
      const entry = await sanityClient.fetch(
        `*[_type == "cashBookEntry" && bill._ref == $billId][0]{_id}`,
        { billId }
      );
      return !!entry;
    } catch {
      return false;
    }
  },

  /**
   * Create cash book entry from bill payment
   * Prevents duplicates by checking existing entries for the same bill
   */
  async createEntryFromBillPayment(paymentData: {
    billId: string;
    userId: string;
    userName: string;
    amount: number;
    paymentType: 'credit' | 'debit';
    paymentDate?: string;
    billNumber?: string;
    totalAmount?: number;
    paymentStatus?: string;
    context?: string;
    transactionId?: string;
  }): Promise<ApiResponse<any>> {
    try {
      // Never allow negative amounts — reject with diagnostic info
      if (paymentData.amount <= 0) {
        console.error(`[RECONCILIATION] Rejecting cashbook entry with invalid amount: ${paymentData.amount}. Bill: ${paymentData.billNumber || paymentData.billId}, PaymentDate: ${paymentData.paymentDate}`);
        return { success: false, error: `Cash book entry amount must be positive (got ${paymentData.amount})` };
      }

      // Check for duplicate transactionId if provided
      if (paymentData.transactionId) {
        const dup = await sanityClient.fetch(
          `*[_type == "cashBookEntry" && transactionId == $tid][0]._id`,
          { tid: paymentData.transactionId }
        );
        if (dup) {
          return { success: true, data: { _id: dup }, message: 'Duplicate: entry exists for this transaction' };
        }
      }

      const now = new Date().toISOString();
      const notes = billPaymentNotes({
        billNumber: paymentData.billNumber,
        paymentStatus: paymentData.paymentStatus,
        context: paymentData.context,
      });
      const entryData = {
        user: {
          _type: "reference",
          _ref: paymentData.userId
        },
        userName: paymentData.userName,
        customerName: paymentData.userName,
        customerId: paymentData.userId,
        amount: paymentData.amount,
        billTotal: paymentData.totalAmount || paymentData.amount,
        totalAmount: paymentData.totalAmount || paymentData.amount,
        pendingAmount: 0,
        receivedAmount: paymentData.amount,
        status: 'completed' as const,
        type: paymentData.paymentType,
        source: "Bill Payment",
        notes,
        bill: {
          _type: "reference",
          _ref: paymentData.billId
        },
        transactionId: paymentData.transactionId,
        createdAt: paymentData.paymentDate || now,
        updatedAt: now,
      };

      return await this.createEntry(entryData);
    } catch (error) {
      console.error('Error creating cash book entry from bill payment:', error);
      return { success: false, error: 'Failed to create cash book entry from bill payment' };
    }
  },

  /**
   * Delete all cash book entries
   */
  async deleteAllEntries(): Promise<ApiResponse<any>> {
    try {
      // First get all entries to delete them one by one
      const getAllQuery = `*[_type == "cashBookEntry"] { _id }`;
      const entries = await sanityClient.fetch(getAllQuery);
      
      if (entries.length === 0) {
        return { success: true, data: { deletedCount: 0 }, message: 'No entries to delete' };
      }

      // Delete all entries
      const transaction = sanityClient.transaction();
      entries.forEach((entry: any) => {
        transaction.delete(entry._id);
      });
      
      const result = await transaction.commit();
      
      return { 
        success: true, 
        data: { deletedCount: entries.length, result },
        message: `Successfully deleted ${entries.length} cash book entries`
      };
    } catch (error) {
      console.error('Error deleting all cash book entries:', error);
      return { success: false, error: 'Failed to delete cash book entries' };
    }
  },

  /**
   * Get cash book entries by date range
   */
  async getEntriesByDateRange(startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('summary', 'true');
      const res = await fetch(`/api/cashbook/entries?${params.toString()}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error || 'Failed to fetch cash book entries by date range' };
      }
      return { success: true, data: json?.data };
    } catch (error) {
      console.error('Error fetching cash book entries by date range:', error);
      return { success: false, error: 'Failed to fetch cash book entries by date range' };
    }
  },

  /**
   * Get cash book summary (total credits, debits, balance)
   */
  async getSummary(): Promise<ApiResponse<any>> {
    try {
      const res = await fetch('/api/cashbook/entries?summary=true');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        return { success: false, error: json?.error || 'Failed to fetch cash book summary' };
      }
      return { success: true, data: json?.summary };
    } catch (error) {
      console.error('Error fetching cash book summary:', error);
      return { success: false, error: 'Failed to fetch cash book summary' };
    }
  },
};

// Export all API services
export const sanityApiService = {
  users: userApiService,
  products: productApiService,
  brands: brandApiService,
  categories: categoryApiService,
  bills: billApiService,
  stockTransactions: stockTransactionApiService,
  payments: paymentApiService,
  addresses: addressApiService,
  followUps: followUpApiService,
  suppliers: supplierApiService,
  online: onlineApiService,
cashBook: cashBookApiService,
};
