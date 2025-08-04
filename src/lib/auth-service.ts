import { sanityClient } from "./sanity";
import { strapiService } from "./strapi-service";

export interface LoginCredentials {
  customerId: string;
  secretKey: string;
}

export interface AuthUser {
  _id: string;
  clerkId: string;
  customerId: string;
  secretKey: string;
  name: string;
  email?: string;
  phone: string;
  location: string;
  role: "admin" | "customer";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  errorType?:
    | "USER_NOT_FOUND"
    | "INVALID_CREDENTIALS"
    | "ACCOUNT_DISABLED"
    | "SERVER_ERROR";
}

/**
 * Authenticate user with customerId and secretKey against Sanity database
 */
export async function authenticateUser(
  credentials: LoginCredentials
): Promise<AuthResult> {
  try {
    console.log("🔐 Authenticating user:", {
      customerId: credentials.customerId,
    });

    // Query Sanity for user with matching customerId and secretKey
    const query = `*[_type == "user" && customerId == $customerId && secretKey == $secretKey][0] {
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

    const user = await sanityClient.fetch(query, {
      customerId: credentials.customerId,
      secretKey: credentials.secretKey,
    });

    if (!user) {
      console.log("❌ User not found or invalid credentials");

      // Check if user exists with just customerId (wrong secret key)
      const userExistsQuery = `*[_type == "user" && customerId == $customerId][0] {
        _id,
        customerId,
        isActive
      }`;

      const existingUser = await sanityClient.fetch(userExistsQuery, {
        customerId: credentials.customerId,
      });

      if (existingUser) {
        return {
          success: false,
          error: "Invalid secret key. Please check your credentials.",
          errorType: "INVALID_CREDENTIALS",
        };
      } else {
        return {
          success: false,
          error:
            "Customer not found. Please contact support to get your account created.",
          errorType: "USER_NOT_FOUND",
        };
      }
    }

    // Check if account is active
    if (!user.isActive) {
      console.log("❌ Account is disabled");
      return {
        success: false,
        error: "Your account has been disabled. Please contact support.",
        errorType: "ACCOUNT_DISABLED",
      };
    }

    console.log("✅ Authentication successful:", {
      userId: user._id,
      role: user.role,
      name: user.name,
    });

    // Update last login time
    try {
      await sanityClient
        .patch(user._id)
        .set({
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .commit();
    } catch (updateError) {
      console.warn("Failed to update last login time:", updateError);
      // Don't fail authentication if we can't update login time
    }

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("🚨 Authentication error:", error);
    return {
      success: false,
      error: "Server error. Please try again later.",
      errorType: "SERVER_ERROR",
    };
  }
}

/**
 * Get user by customerId (for checking if user exists)
 */
export async function getUserByCustomerId(
  customerId: string
): Promise<AuthUser | null> {
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
    return user || null;
  } catch (error) {
    console.error("Error fetching user by customerId:", error);
    return null;
  }
}

/**
 * Create a new customer account
 */
export async function createCustomerAccount(data: {
  name: string;
  phone: string;
  email?: string;
  location: string;
}): Promise<AuthResult> {
  try {
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
      clerkId: `customer_${Date.now()}`,
      customerId,
      secretKey,
      name: data.name,
      email: data.email,
      phone: data.phone,
      location: data.location,
      role: "customer" as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdUser = await sanityClient.create(newUser);

    // Sync user to Strapi
    try {
      await strapiService.sync.syncUserToStrapi(createdUser);
      console.log('✅ User synced to Strapi successfully');
    } catch (strapiError) {
      console.warn('⚠️ Failed to sync user to Strapi:', strapiError);
      // Don't fail the operation if Strapi sync fails
    }

    return {
      success: true,
      user: createdUser as AuthUser,
    };
  } catch (error) {
    console.error("Error creating customer account:", error);
    return {
      success: false,
      error: "Failed to create account. Please try again.",
      errorType: "SERVER_ERROR",
    };
  }
}

/**
 * Get support contact information
 */
export function getSupportContact() {
  return {
    email:
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@electricianshop.com",
    phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91-9876543210",
    whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "+91-9876543210",
  };
}
