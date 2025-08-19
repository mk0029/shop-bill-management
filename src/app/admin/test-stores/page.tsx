"use client";

import { useEffect } from "react";
import { useBrandStore } from "@/store/brand-store";
import { useCategoryStore } from "@/store/category-store";
import { useSpecificationsStore } from "@/store/specifications-store";
import { useInventoryStore } from "@/store/inventory-store";

export default function TestStoresPage() {
  const { brands, fetchBrands, isLoading: brandsLoading } = useBrandStore();
  const {
    categories,
    fetchCategories,
    isLoading: categoriesLoading,
  } = useCategoryStore();
  const { getOptionsByCategory } = useSpecificationsStore();
  const {
    products,
    fetchProducts,
    isLoading: productsLoading,
  } = useInventoryStore();

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    fetchProducts();
  }, [fetchBrands, fetchCategories, fetchProducts]);

  const lightTypes = getOptionsByCategory("light", "lightType");
  const colors = getOptionsByCategory("light", "color");
  const wireGauges = getOptionsByCategory("wire", "wireGauge");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
        Store Testing Page
      </h1>

      {/* Brands */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-2">
          Brands {brandsLoading && "(Loading...)"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {brands.map((brand) => (
            <div
              key={brand._id}
              className="bg-gray-700 p-2 rounded text-white text-sm"
            >
              {brand.name}
            </div>
          ))}
        </div>
        {brands.length === 0 && !brandsLoading && (
          <p className="text-gray-400">No brands found</p>
        )}
      </div>

      {/* Categories */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-2">
          Categories {categoriesLoading && "(Loading...)"}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {categories.map((category) => (
            <div
              key={category._id}
              className="bg-gray-700 p-2 rounded text-white text-sm"
            >
              {category.name}
            </div>
          ))}
        </div>
        {categories.length === 0 && !categoriesLoading && (
          <p className="text-gray-400">No categories found</p>
        )}
      </div>

      {/* Specifications */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-2">
          Specifications
        </h2>

        <div className="space-y-3">
          <div>
            <h3 className="text-white font-medium">Light Types:</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {lightTypes.map((type) => (
                <span
                  key={type.value}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                >
                  {type.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-medium">Colors:</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {colors.map((color) => (
                <span
                  key={color.value}
                  className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                >
                  {color.label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-medium">Wire Gauges:</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              {wireGauges.map((gauge) => (
                <span
                  key={gauge.value}
                  className="bg-purple-600 text-white px-2 py-1 rounded text-xs"
                >
                  {gauge.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-2">
          Products {productsLoading && "(Loading...)"}
        </h2>
        <div className="space-y-2">
          {products.slice(0, 5).map((product) => (
            <div
              key={product._id}
              className="bg-gray-700 p-3 rounded text-white"
            >
              <div className="font-medium">{product.name}</div>
              <div className="text-sm text-gray-300">
                Brand: {product.brand?.name} | Category:{" "}
                {product.category?.name}
              </div>
              <div className="text-sm text-gray-400">
                Price: ₹{product.pricing?.sellingPrice} | Stock:{" "}
                {product.inventory?.currentStock}
              </div>
            </div>
          ))}
        </div>
        {products.length === 0 && !productsLoading && (
          <p className="text-gray-400">No products found</p>
        )}
      </div>
    </div>
  );
}
