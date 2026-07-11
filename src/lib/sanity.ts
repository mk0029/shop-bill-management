import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

// Decide perspective dynamically: include drafts when a token is available
// Server should prefer private SANITY_API_TOKEN; browser must not use it
const serverToken = process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN || "";
const publicToken = process.env.NEXT_PUBLIC_SANITY_API_TOKEN || "";
const runtimeToken = typeof window === "undefined" ? serverToken : publicToken;
const hasToken = !!runtimeToken;
const effectivePerspective = hasToken ? "drafts" : "published";

// Sanity client configuration
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ,
  useCdn: false, // Real-time updates require CDN to be false
  apiVersion: "2024-01-01",
  // Prefer secure server-side token; fallback to NEXT_PUBLIC for legacy setups
  token: runtimeToken || undefined,
  ignoreBrowserTokenWarning: true,
  perspective: effectivePerspective,
});

// Debug token availability
if (typeof window === "undefined") {
  // Server-side
 
  
} else {
  // Client-side - should not have access to server token
}
// Image URL builder
const builder = imageUrlBuilder(sanityClient);

export const urlFor = (source: SanityImageSource) => builder.image(source);

// Real-time listener setup
export const setupRealtimeListeners = (callback: (update: unknown) => void) => {
  // Get current user role to determine what to listen to
  const { role, user } = typeof window !== 'undefined' ? 
    (window as any).__AUTH_STORE__?.getState() || { role: 'admin', user: null } : 
    { role: 'admin', user: null };
  
  const userId = (user as any)?.id || (user as any)?._id;
  const customerId = (user as any)?.customerId;
  
  let query: string;
  let params: any = {};
  
  if (role === "customer") {
    // Customers only listen to their own bills and user updates
    query = '*[_type in ["bill", "user"]]';
    // Note: We can't filter by customer here since this is a generic listener
    // The filtering should be done in the callback
  } else {
    // Admins listen to all document types
    query = '*[_type in ["user", "product", "bill", "stockTransaction", "brand", "category", "billMessage"]]';
  }
  
  const subscription = sanityClient
    .listen(query, params, {
      includeResult: true,
      visibility: 'query'
    })
    .subscribe((update) => callback(update as unknown));

  return subscription;
};

// Helper function to generate frontend IDs
export const generateId = () =>
  window.btoa(Date.now().toString() + Math.random().toString());

// GROQ queries for data fetching
export const queries = {
  // Get all brands (try both new and legacy schemas)
  brands: `*[_type == "brand" || _type == "brands"] {
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
  }[defined(_id)] | order(name asc)`,

  // Get all categories
  categories: `*[_type == "category"] {
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
  }[defined(_id)] | order(name asc)`,

  // Get all products with references
  products: `*[_type == "product"] {
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
  }[defined(_id)] | order(name asc)`,

  // Get active products only
  activeProducts: `*[_type == "product" && isActive == true] {
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
      parentCategory->{
        _id,
        name
      },
      "isActive": select(
        defined(isActive) => isActive,
        true
      )
    }
  } | order(name asc)`,

  // Get all users
  users: `*[_type == "user"] {
    _id,
    _type,
    clerkId,
    customerId,
    secretKey,
    name,
    nickname,
    email,
    phone,
    location,
    profileImage,
    "profileImageUrl": profileImage.asset->url,
    reminderLimit,
    dueReminderRepeatDays,
    reminderIntervalDays,
    preferredChannels,
    preferredReminderTime,
    allowDueReminder,
    lastDueReminderSentAt,
    lastDueReminderAmount,
    reminderCount,
    role,
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
  }[defined(_id)] | order(name asc)`,

  // Get customers only
  customers: `*[_type == "user" && role == "customer"] {
    _id,
    _type,
    clerkId,
    customerId,
    secretKey,
    name,
    nickname,
    email,
    phone,
    location,
    reminderLimit,
    dueReminderRepeatDays,
    reminderIntervalDays,
    preferredChannels,
    preferredReminderTime,
    allowDueReminder,
    lastDueReminderSentAt,
    lastDueReminderAmount,
    reminderCount,
    role,
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
  } | order(name asc)`,

  // Get bills with customer and items
  bills: `*[_type == "bill"] {
    _id,
    billId,
    billNumber,
    customer->{
      _id,
      name,
      nickname,
      phone,
      email,
      location,
      role
    },
    technician->{
      _id,
      name,
      nickname,
      phone,
      email
    },
    "items": items[]{
      ...,
      "product": product->{
        _id,
        _type,
        name,
        productName,
        description,
        specifications,
        "brand": brand->{name, _id},
        "category": category->{name, _id}
      },
    },
    serviceType,
    locationType,
    serviceDate,
    dueDate,
    visitingCharges,
    transportationFee,
    "repairFee": coalesce(repairFee, repairfee, 0),
    laborCharges,
    subtotal,
    taxAmount,
    "discount": coalesce(discount, discountAmount, 0),
    totalAmount,
    paymentStatus,
    paymentMethod,
    paidAmount,
    balanceAmount,
    status,
    priority,
    notes,
    internalNotes,
    createdAt,
    updatedAt
  } | order(createdAt desc)`,

  // Get bills for specific customer (handle different reference formats)
  customerBills: (customerId: string) => `*[_type == "bill" && (
    customer._ref == "${customerId}" || 
    customer == "${customerId}" || 
    customer._id == "${customerId}" ||
    customer->_id == "${customerId}" ||
    customer->customerId == "${customerId}"
  )] {
    _id,
    billId,
    billNumber,
    customer,
    customer->{
      _id,
      customerId,
      name,
      phone,
      email,
      location,
      role
    },
    technician->{
      _id,
      name,
      nickname,
      phone,
      email
    },
    "items": items[]{
      ...,
      "product": product->{
        _id,
        _type,
        name,
        productName,
        description,
        specifications,
        "brand": brand->{name, _id},
        "category": category->{name, _id}
      },
    },
    serviceType,
    locationType,
    dueDate,
    serviceDate,
    visitingCharges,
    transportationFee,
    "repairFee": coalesce(repairFee, repairfee, 0),
    laborCharges,
    subtotal,
    taxAmount,
    "discount": coalesce(discount, discountAmount, 0),
    totalAmount,
    paymentStatus,
    paymentMethod,
    paidAmount,
    balanceAmount,
    status,
    priority,
    notes,
    internalNotes,
    createdAt,
    updatedAt
  } | order(createdAt desc)`,

  // Get stock transactions
  stockTransactions: `*[_type == "stockTransaction"] {
    ...,
    product->{
      _id,
      name,
      nickname,
      productId,
      pricing,
      inventory
    }
  } | order(transactionDate desc)`,

  // Simple test queries
  testConnection: '*[_type match "*brand*"][0...3]',

  // Simplified queries for testing
  simpleBrands: '*[_type == "brand" || _type == "brands"][0...5]',
  simpleCategories: '*[_type == "category"][0...5]',
  simpleProducts: '*[_type == "product"][0...5]',

  // Get all document types in the dataset
  documentTypes: "*[]._type",

  // WhatsApp Configuration queries
  whatsappConfigs: `*[_type == "whatsappConfig" && isActive == true] | order(priority asc) {
    _id,
    configName,
    isActive,
    businessInfo,
    devices,
    messageTemplate,
    loadBalancing,
    analytics,
    createdAt,
    updatedAt
  }`,

  whatsappConfig: (
    configId: string
  ) => `*[_type == "whatsappConfig" && _id == "${configId}"][0] {
    _id,
    configName,
    isActive,
    businessInfo,
    devices,
    messageTemplate,
    loadBalancing,
    analytics,
    createdAt,
    updatedAt
  }`,
};
