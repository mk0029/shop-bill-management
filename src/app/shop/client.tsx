"use client";

import { useEffect, useState } from "react";
import { SanityImage } from "@/components/ui/sanity-image";
import { sanityClient } from "@/lib/sanity";
import { Loader2, ShoppingCart, ImageIcon, Tag, Star } from "lucide-react";

interface PublicProduct {
  _id: string;
  name: string;
  slug: { current: string };
  shortDescription?: string;
  images: any[];
  pricing: { sellingPrice: number; mrp?: number; unit?: string };
  stockCount: number;
  inStock: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  category?: { name: string; slug: { current: string } };
  rating?: number;
  reviewCount?: number;
  features?: string[];
}

export default function PublicShopClient() {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await sanityClient.fetch(
        `*[_type == "shopProduct" && isActive == true] {
          _id,
          name,
          slug,
          shortDescription,
          images,
          pricing,
          stockCount,
          inStock,
          isFeatured,
          isNewArrival,
          category->{ name, slug },
          rating,
          reviewCount,
          features
        } | order(isFeatured desc, createdAt desc)`
      );
      setProducts(data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const filtered = categoryFilter
    ? products.filter((p) => p.category?.slug?.current === categoryFilter)
    : products;

  const categories = Array.from(
    new Map(products.filter((p) => p.category).map((p) => [p.category!.slug.current, p.category!.name]))
  );

  const discountPercent = (mrp: number, selling: number) =>
    mrp > selling ? Math.round(((mrp - selling) / mrp) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Shop</h1>
          <p className="text-gray-400 mt-1">Discover our products</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              !categoryFilter
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            All
          </button>
          {categories.map(([slug, name]) => (
            <button
              key={slug}
              onClick={() => setCategoryFilter(slug)}
              className={`px-4 py-2 rounded-full text-sm transition-colors ${
                categoryFilter === slug
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShoppingCart className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No products available</h3>
            <p className="text-gray-400">Check back later for new arrivals</p>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product) => {
              const discount = product.pricing.mrp
                ? discountPercent(product.pricing.mrp, product.pricing.sellingPrice)
                : 0;

              return (
                <div
                  key={product._id}
                  className="group rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-cyan-500/30 transition-all"
                >
                  <div className="relative aspect-square bg-white/5 overflow-hidden">
                    {product.images?.[0] ? (
                      <SanityImage
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        fallback={
                          <div className="flex items-center justify-center h-full">
                            <ImageIcon className="h-10 w-10 text-gray-500" />
                          </div>
                        }
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-10 w-10 text-gray-500" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.isNewArrival && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/80 text-[10px] font-semibold text-white">
                          New
                        </span>
                      )}
                      {discount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/80 text-[10px] font-semibold text-white">
                          {discount}% OFF
                        </span>
                      )}
                    </div>
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">Out of Stock</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    {product.category && (
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                        {product.category.name}
                      </p>
                    )}
                    <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                    {product.features && product.features.length > 0 && (
                      <p className="text-[10px] text-gray-500 line-clamp-1">
                        {product.features[0]}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-white">
                        ₹{product.pricing.sellingPrice}
                      </span>
                      {product.pricing.mrp && product.pricing.mrp > product.pricing.sellingPrice && (
                        <span className="text-xs text-gray-500 line-through">
                          ₹{product.pricing.mrp}
                        </span>
                      )}
                    </div>
                    <button
                      disabled={!product.inStock}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-500/20 text-cyan-400 py-2 text-sm font-medium hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {product.inStock ? "Add to Cart" : "Sold Out"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
