import { sanityClient } from "./sanity";

// Strapi configuration
const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// Strapi API client
const strapiClient = {
  baseURL: STRAPI_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${STRAPI_API_TOKEN}`,
  },
};

// Strapi API endpoints
const STRAPI_ENDPOINTS = {
  users: '/api/users',
  customers: '/api/customers',
  products: '/api/products',
  categories: '/api/categories',
  brands: '/api/brands',
  bills: '/api/bills',
  payments: '/api/payments',
  addresses: '/api/addresses',
  stockTransactions: '/api/stock-transactions',
  suppliers: '/api/suppliers',
  followUps: '/api/follow-ups',
};

// Types for Strapi data
export interface StrapiUser {
  id: number;
  attributes: {
    clerkId: string;
    customerId: string;
    secretKey: string;
    name: string;
    email?: string;
    phone: string;
    location: string;
    role: 'admin' | 'customer';
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiError {
  error: {
    status: number;
    name: string;
    message: string;
    details?: any;
  };
}

// Helper function to make Strapi API calls
async function strapiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${strapiClient.baseURL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...strapiClient.headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Strapi API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`
    );
  }

  return response.json();
}

// User management functions
export const strapiUserService = {
  /**
   * Create a new user in Strapi
   */
  async createUser(userData: {
    clerkId: string;
    customerId: string;
    secretKey: string;
    name: string;
    email?: string;
    phone: string;
    location: string;
    role: 'admin' | 'customer';
  }): Promise<StrapiUser> {
    const payload = {
      data: {
        clerkId: userData.clerkId,
        customerId: userData.customerId,
        secretKey: userData.secretKey,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        location: userData.location,
        role: userData.role,
        isActive: true,
      },
    };

    return strapiRequest<StrapiUser>(STRAPI_ENDPOINTS.users, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update user in Strapi
   */
  async updateUser(
    userId: number,
    userData: Partial<{
      name: string;
      email: string;
      phone: string;
      location: string;
      isActive: boolean;
    }>
  ): Promise<StrapiUser> {
    const payload = {
      data: userData,
    };

    return strapiRequest<StrapiUser>(`${STRAPI_ENDPOINTS.users}/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get user by customerId
   */
  async getUserByCustomerId(customerId: string): Promise<StrapiUser | null> {
    try {
      const response = await strapiRequest<StrapiResponse<StrapiUser[]>>(
        `${STRAPI_ENDPOINTS.users}?filters[customerId][$eq]=${customerId}`
      );
      return response.data[0] || null;
    } catch (error) {
      console.error('Error fetching user from Strapi:', error);
      return null;
    }
  },

  /**
   * Get all users
   */
  async getAllUsers(): Promise<StrapiUser[]> {
    const response = await strapiRequest<StrapiResponse<StrapiUser[]>>(
      STRAPI_ENDPOINTS.users
    );
    return response.data;
  },

  /**
   * Get customers only
   */
  async getCustomers(): Promise<StrapiUser[]> {
    const response = await strapiRequest<StrapiResponse<StrapiUser[]>>(
      `${STRAPI_ENDPOINTS.users}?filters[role][$eq]=customer`
    );
    return response.data;
  },
};

// Product management functions
export const strapiProductService = {
  /**
   * Create a new product in Strapi
   */
  async createProduct(productData: any): Promise<any> {
    const payload = {
      data: productData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.products}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all products
   */
  async getAllProducts(): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      STRAPI_ENDPOINTS.products
    );
    return response.data;
  },

  /**
   * Update product
   */
  async updateProduct(productId: number, productData: any): Promise<any> {
    const payload = {
      data: productData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.products}/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

// Bill management functions
export const strapiBillService = {
  /**
   * Create a new bill in Strapi
   */
  async createBill(billData: any): Promise<any> {
    const payload = {
      data: billData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.bills}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all bills
   */
  async getAllBills(): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      STRAPI_ENDPOINTS.bills
    );
    return response.data;
  },

  /**
   * Get bills for specific customer
   */
  async getCustomerBills(customerId: string): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      `${STRAPI_ENDPOINTS.bills}?filters[customer][customerId][$eq]=${customerId}`
    );
    return response.data;
  },
};

// Category management functions
export const strapiCategoryService = {
  /**
   * Create a new category in Strapi
   */
  async createCategory(categoryData: any): Promise<any> {
    const payload = {
      data: categoryData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.categories}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      STRAPI_ENDPOINTS.categories
    );
    return response.data;
  },
};

// Brand management functions
export const strapiBrandService = {
  /**
   * Create a new brand in Strapi
   */
  async createBrand(brandData: any): Promise<any> {
    const payload = {
      data: brandData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.brands}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all brands
   */
  async getAllBrands(): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      STRAPI_ENDPOINTS.brands
    );
    return response.data;
  },
};

// Stock transaction functions
export const strapiStockService = {
  /**
   * Create a new stock transaction in Strapi
   */
  async createStockTransaction(transactionData: any): Promise<any> {
    const payload = {
      data: transactionData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.stockTransactions}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all stock transactions
   */
  async getAllStockTransactions(): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      STRAPI_ENDPOINTS.stockTransactions
    );
    return response.data;
  },
};

// Payment functions
export const strapiPaymentService = {
  /**
   * Create a new payment in Strapi
   */
  async createPayment(paymentData: any): Promise<any> {
    const payload = {
      data: paymentData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.payments}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all payments
   */
  async getAllPayments(): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      STRAPI_ENDPOINTS.payments
    );
    return response.data;
  },
};

// Address functions
export const strapiAddressService = {
  /**
   * Create a new address in Strapi
   */
  async createAddress(addressData: any): Promise<any> {
    const payload = {
      data: addressData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.addresses}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get addresses for specific customer
   */
  async getCustomerAddresses(customerId: string): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      `${STRAPI_ENDPOINTS.addresses}?filters[customer][customerId][$eq]=${customerId}`
    );
    return response.data;
  },
};

// Follow-up functions
export const strapiFollowUpService = {
  /**
   * Create a new follow-up in Strapi
   */
  async createFollowUp(followUpData: any): Promise<any> {
    const payload = {
      data: followUpData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.followUps}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all follow-ups
   */
  async getAllFollowUps(): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      STRAPI_ENDPOINTS.followUps
    );
    return response.data;
  },
};

// Supplier functions
export const strapiSupplierService = {
  /**
   * Create a new supplier in Strapi
   */
  async createSupplier(supplierData: any): Promise<any> {
    const payload = {
      data: supplierData,
    };

    return strapiRequest(`${STRAPI_ENDPOINTS.suppliers}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all suppliers
   */
  async getAllSuppliers(): Promise<any[]> {
    const response = await strapiRequest<StrapiResponse<any[]>>(
      STRAPI_ENDPOINTS.suppliers
    );
    return response.data;
  },
};

// Synchronization functions
export const strapiSyncService = {
  /**
   * Sync user from Sanity to Strapi
   */
  async syncUserToStrapi(sanityUser: any): Promise<StrapiUser | null> {
    try {
      // Check if user already exists in Strapi
      const existingUser = await strapiUserService.getUserByCustomerId(
        sanityUser.customerId
      );

      if (existingUser) {
        // Update existing user
        return await strapiUserService.updateUser(existingUser.id, {
          name: sanityUser.name,
          email: sanityUser.email,
          phone: sanityUser.phone,
          location: sanityUser.location,
          isActive: sanityUser.isActive,
        });
      } else {
        // Create new user
        return await strapiUserService.createUser({
          clerkId: sanityUser.clerkId,
          customerId: sanityUser.customerId,
          secretKey: sanityUser.secretKey,
          name: sanityUser.name,
          email: sanityUser.email,
          phone: sanityUser.phone,
          location: sanityUser.location,
          role: sanityUser.role,
        });
      }
    } catch (error) {
      console.error('Error syncing user to Strapi:', error);
      return null;
    }
  },

  /**
   * Sync all users from Sanity to Strapi
   */
  async syncAllUsersToStrapi(): Promise<void> {
    try {
      const sanityUsers = await sanityClient.fetch(
        `*[_type == "user"] {
          _id,
          clerkId,
          customerId,
          secretKey,
          name,
          email,
          phone,
          location,
          role,
          isActive
        }`
      );

      for (const user of sanityUsers) {
        await this.syncUserToStrapi(user);
      }

      console.log(`Synced ${sanityUsers.length} users to Strapi`);
    } catch (error) {
      console.error('Error syncing all users to Strapi:', error);
    }
  },
};

// Export all services
export const strapiService = {
  users: strapiUserService,
  products: strapiProductService,
  bills: strapiBillService,
  categories: strapiCategoryService,
  brands: strapiBrandService,
  stock: strapiStockService,
  payments: strapiPaymentService,
  addresses: strapiAddressService,
  followUps: strapiFollowUpService,
  suppliers: strapiSupplierService,
  sync: strapiSyncService,
}; 