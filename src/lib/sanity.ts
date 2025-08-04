import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";

// Sanity client configuration
export const sanityClient = createClient({
  projectId: "idji8ni7", // Your project ID from sanity.config.js
  dataset: "production",
  useCdn: false, // Real-time updates require CDN to be false
  apiVersion: "2024-01-01",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN, // For write operations
  ignoreBrowserTokenWarning: true, // Suppress browser token warnings
  perspective: "published", // Use published perspective for better compatibility
});

console.log( process.env.NEXT_PUBLIC_SANITY_API_TOKEN,' process.env.SANITY_API_TOKEN process.env.SANITY_API_TOKEN process.env.SANITY_API_TOKEN process.env.SANITY_API_TOKEN')
// Image URL builder
const builder = imageUrlBuilder(sanityClient);

export const urlFor = (source: any) => builder.image(source);

// Real-time listener setup
export const setupRealtimeListeners = (callback: (update: any) => void) => {
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
  } | order(name asc)`,

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
  } | order(name asc)`,

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
  } | order(name asc)`,

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
  } | order(name asc)`,

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
    ...,
    customer->{
      _id,
      name,
      phone,
      email,
      location,
      role
    },
    items[]->
  } | order(createdAt desc)`,

  // Get bills for specific customer
  customerBills: (
    customerId: string
  ) => `*[_type == "bill" && customer._ref == "${customerId}"] {
    ...,
    customer->{
      _id,
      name,
      phone,
      email,
      location,
      role
    },
    items[]->
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
  documentTypes:
    '*[] | { "type": _type } | group(type) | { "documentType": type, "count": count() }',
};
