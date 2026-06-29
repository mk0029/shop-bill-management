import { sanityClient, urlFor } from "@/lib/sanity";

export interface ShopCategory {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  icon?: string;
  image?: any;
  productCount: number;
}

export interface ShopProduct {
  _id: string;
  name: string;
  slug: { current: string };
  shortDescription?: string;
  description?: string;
  category: { _id: string; name: string; slug: { current: string } };
  subcategory?: { _id: string; name: string; slug: { current: string } };
  brand?: string;
  images: Array<{ _key?: string; alt?: string; caption?: string }>;
  videos: Array<{ _key?: string; caption?: string; url?: string }>;
  pricing: { sellingPrice: number; mrp?: number; unit: string };
  inStock: boolean;
  stockCount: number;
  lowStockThreshold: number;
  features?: string[];
  specifications?: Array<{ label: string; value: string }>;
  tags?: string[];
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  rating?: number;
  reviewCount?: number;
}

export async function fetchShopCategories(): Promise<ShopCategory[]> {
  const query = `*[_type == "shopCategory" && isActive == true] {
    _id,
    name,
    slug,
    description,
    icon,
    image,
    "productCount": count(*[_type == "shopProduct" && isActive == true && references(^._id)])
  } | order(sortOrder asc, name asc)`;

  return sanityClient.fetch(query);
}

export async function fetchShopProductsByCategory(
  categorySlug: string,
): Promise<ShopProduct[]> {
  const query = `*[_type == "shopProduct" && isActive == true && category->slug.current == $slug] {
    _id,
    name,
    slug,
    shortDescription,
    description,
    category->{ _id, name, slug },
    subcategory->{ _id, name, slug },
    brand,
    images,
    "videos": videos[]{
      _key,
      "caption": caption,
      "url": asset->url
    },
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
    rating,
    reviewCount
  } | order(isFeatured desc, isNewArrival desc, name asc)`;

  return sanityClient.fetch(query, { slug: categorySlug });
}

export async function fetchShopProductBySlug(
  productSlug: string,
): Promise<ShopProduct | null> {
  const query = `*[_type == "shopProduct" && slug.current == $slug][0] {
    _id,
    name,
    slug,
    shortDescription,
    description,
    category->{ _id, name, slug },
    subcategory->{ _id, name, slug },
    brand,
    images,
    "videos": videos[]{
      _key,
      "caption": caption,
      "url": asset->url
    },
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
    rating,
    reviewCount
  }`;

  return sanityClient.fetch(query, { slug: productSlug });
}

export async function fetchShopCategoryBySlug(
  slug: string,
): Promise<ShopCategory | null> {
  const query = `*[_type == "shopCategory" && slug.current == $slug][0] {
    _id,
    name,
    slug,
    description,
    icon,
    image,
    "productCount": count(*[_type == "shopProduct" && isActive == true && references(^._id)])
  }`;

  return sanityClient.fetch(query, { slug });
}

export function getSanityImageUrl(source: any): string | null {
  if (!source) return null;
  try {
    return urlFor(source).width(600).url();
  } catch {
    return null;
  }
}

export function getSanityImageUrlFull(source: any): string | null {
  if (!source) return null;
  try {
    return urlFor(source).width(1200).url();
  } catch {
    return null;
  }
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateDiscount(mrp: number, sellingPrice: number): number {
  if (!mrp || !sellingPrice || mrp <= sellingPrice) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}
