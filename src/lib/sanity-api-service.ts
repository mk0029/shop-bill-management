import { sanityClient } from "./sanity";
import { strapiService } from "./strapi-service";

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
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
        email: userData.email,
        phone: formattedPhone, // Use formatted phone number
        location: userData.location,
        role: userData.role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdUser = await sanityClient.create(newUser);

      // Send secret key via WhatsApp (placeholder)

      // Sync to Strapi in background (non-blocking)
      strapiService.sync
        .syncUserToStrapi(createdUser)
        .then(() => {
        })
        .catch((strapiError) => {
          console.warn("⚠️ Failed to sync user to Strapi:", strapiError);
        });

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
      email: string;
      phone: string;
      location: string;
      isActive: boolean;
    }>
  ): Promise<ApiResponse<any>> {
    try {
      const updatedUser = await sanityClient
        .patch(userId)
        .set({
          ...userData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

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
      await sanityClient.delete(userId);
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
  /**
   * Get all brands
   */
  async getAllBrands(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "brand" || _type == "brands"] {
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
        ),
        "createdAt": select(
          defined(createdAt) => createdAt,
          _createdAt
        ),
        "updatedAt": select(
          defined(updatedAt) => updatedAt,
          _updatedAt
        )
      } | order(name asc)`;

      const brands = await sanityClient.fetch(query);
      return { success: true, data: brands };
    } catch (error) {
      console.error('Error fetching brands:', error);
      return { success: false, error: 'Failed to fetch brands' };
    }
  },

  /**
   * Get brand by ID
   */
  async getBrandById(brandId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type in ["brand", "brands"] && _id == $brandId][0] {
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
      }`;

      const brand = await sanityClient.fetch(query, { brandId });
      if (!brand) {
        return { success: false, error: 'Brand not found' };
      }
      return { success: true, data: brand };
    } catch (error) {
      console.error('Error fetching brand:', error);
      return { success: false, error: 'Failed to fetch brand' };
    }
  },

  /**
   * Create new brand
   */
  async createBrand(brandData: any): Promise<ApiResponse<any>> {
    try {
      const newBrand = {
        _type: "brand",
        ...brandData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdBrand = await sanityClient.create(newBrand);

      // Sync to Strapi
      try {
        await strapiService.brands.createBrand(createdBrand);
      } catch (strapiError) {
        console.warn('Failed to sync brand to Strapi:', strapiError);
      }

      return { success: true, data: createdBrand };
    } catch (error) {
      console.error('Error creating brand:', error);
      return { success: false, error: 'Failed to create brand' };
    }
  },

  /**
   * Update brand
   */
  async updateBrand(
    brandId: string,
    brandData: any
  ): Promise<ApiResponse<any>> {
    try {
      const updatedBrand = await sanityClient
        .patch(brandId)
        .set({
          ...brandData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Sync to Strapi
      try {
        await strapiService.brands.createBrand(updatedBrand);
      } catch (strapiError) {
        console.warn('Failed to sync brand to Strapi:', strapiError);
      }

      return { success: true, data: updatedBrand };
    } catch (error) {
      console.error('Error updating brand:', error);
      return { success: false, error: 'Failed to update brand' };
    }
  },

  /**
   * Delete brand
   */
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
  /**
   * Get all categories
   */
  async getAllCategories(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "category"] {
        _id,
        _type,
        name,
        slug,
        description,
        icon,
        parentCategory,
        "isActive": select(
          defined(isActive) => isActive,
          true
        ),
        "sortOrder": select(
          defined(sortOrder) => sortOrder,
          0
        ),
        "createdAt": select(
          defined(createdAt) => createdAt,
          _createdAt
        ),
        "updatedAt": select(
          defined(updatedAt) => updatedAt,
          _updatedAt
        )
      } | order(name asc)`;

      const categories = await sanityClient.fetch(query);
      return { success: true, data: categories };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return { success: false, error: 'Failed to fetch categories' };
    }
  },

  /**
   * Get category by ID
   */
  async getCategoryById(categoryId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "category" && _id == $categoryId][0] {
        _id,
        _type,
        name,
        slug,
        description,
        icon,
        parentCategory,
        "isActive": select(
          defined(isActive) => isActive,
          true
        )
      }`;

      const category = await sanityClient.fetch(query, { categoryId });
      if (!category) {
        return { success: false, error: 'Category not found' };
      }
      return { success: true, data: category };
    } catch (error) {
      console.error('Error fetching category:', error);
      return { success: false, error: 'Failed to fetch category' };
    }
  },

  /**
   * Create new category
   */
  async createCategory(categoryData: any): Promise<ApiResponse<any>> {
    try {
      const newCategory = {
        _type: "category",
        ...categoryData,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdCategory = await sanityClient.create(newCategory);

      // Sync to Strapi
      try {
        await strapiService.categories.createCategory(createdCategory);
      } catch (strapiError) {
        console.warn('Failed to sync category to Strapi:', strapiError);
      }

      return { success: true, data: createdCategory };
    } catch (error) {
      console.error('Error creating category:', error);
      return { success: false, error: 'Failed to create category' };
    }
  },

  /**
   * Update category
   */
  async updateCategory(
    categoryId: string,
    categoryData: any
  ): Promise<ApiResponse<any>> {
    try {
      const updatedCategory = await sanityClient
        .patch(categoryId)
        .set({
          ...categoryData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Sync to Strapi
      try {
        await strapiService.categories.createCategory(updatedCategory);
      } catch (strapiError) {
        console.warn('Failed to sync category to Strapi:', strapiError);
      }

      return { success: true, data: updatedCategory };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: 'Failed to update category' };
    }
  },

  /**
   * Delete category
   */
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
  /**
   * Get all bills
   */
  async getAllBills(): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "bill"] {
        ...,
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

  /**
   * Get bill by ID
   */
  async getBillById(billId: string): Promise<ApiResponse<any>> {
    try {
      const query = `*[_type == "bill" && _id == $billId][0] {
        ...,
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

  /**
   * Get bills for specific customer
   */
  async getCustomerBills(customerId: string): Promise<ApiResponse<any[]>> {
    try {
      const query = `*[_type == "bill" && customer._ref == $customerId] {
        ...,
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

      const bills = await sanityClient.fetch(query, { customerId });
      return { success: true, data: bills };
    } catch (error) {
      console.error('Error fetching customer bills:', error);
      return { success: false, error: 'Failed to fetch customer bills' };
    }
  },

  /**
   * Create new bill
   */
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

      const createdBill = await sanityClient.create(newBill);

      // Sync to Strapi
      try {
        await strapiService.bills.createBill(createdBill);
      } catch (strapiError) {
        console.warn('Failed to sync bill to Strapi:', strapiError);
      }

      return { success: true, data: createdBill };
    } catch (error) {
      console.error('Error creating bill:', error);
      return { success: false, error: 'Failed to create bill' };
    }
  },

  /**
   * Update bill
   */
  async updateBill(
    billId: string,
    billData: any
  ): Promise<ApiResponse<any>> {
    try {
      const updatedBill = await sanityClient
        .patch(billId)
        .set({
          ...billData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      // Sync to Strapi
      try {
        await strapiService.bills.createBill(updatedBill);
      } catch (strapiError) {
        console.warn('Failed to sync bill to Strapi:', strapiError);
      }

      return { success: true, data: updatedBill };
    } catch (error) {
      console.error('Error updating bill:', error);
      return { success: false, error: 'Failed to update bill' };
    }
  },

  /**
   * Delete bill
   */
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

      const createdTransaction = await sanityClient.create(newTransaction);

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
      const updatedTransaction = await sanityClient
        .patch(transactionId)
        .set({
          ...transactionData,
          updatedAt: new Date().toISOString(),
        })
        .commit();

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
      await sanityClient.delete(transactionId);
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
}; 