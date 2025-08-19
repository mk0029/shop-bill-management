import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

// Sanity client configuration
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "idji8ni7",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  useCdn: false, // Real-time updates require CDN to be false
  apiVersion: "2024-01-01",
  // Prefer secure server-side token; fallback to NEXT_PUBLIC for legacy setups
  token:
    process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  ignoreBrowserTokenWarning: true,
  perspective: "published",
});

// Debug token availability
if (typeof window === "undefined") {
  // Server-side
  console.log(
    "Server-side Sanity token available:",
    !!(process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN)
  );
} else {
  // Client-side - should not have access to server token
  console.log("Client-side Sanity setup - using read-only access");
}
// Image URL builder
const builder = imageUrlBuilder(sanityClient);

export const urlFor = (source: unknown) => builder.image(source);

// Real-time listener setup
export const setupRealtimeListeners = (callback: (update: unknown) => void) => {
  const subscription = sanityClient
    .listen(
      '*[_type in ["user", "product", "bill", "stockTransaction", "brand", "category"]]'
    )
    .subscribe((update) => {
      callback(update);
    });

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
    email,
    phone,
    location,
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
    email,
    phone,
    location,
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
      phone,
      email,
      location,
      role
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
    homeVisitFee,
    transportationFee,
    "repairFee": coalesce(repairFee, repairfee, 0),
    laborCharges,
    subtotal,
    taxAmount,
    discountAmount,
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
    homeVisitFee,
    transportationFee,
    "repairFee": coalesce(repairFee, repairfee, 0),
    laborCharges,
    subtotal,
    taxAmount,
    discountAmount,
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
