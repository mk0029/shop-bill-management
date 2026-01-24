"use client";

import { useEffect } from "react";
import { useDataStore } from "@/store/data-store";

export type AdminHydrationData = {
  products?: Array<Record<string, any>>;
  brands?: Array<Record<string, any>>;
  categories?: Array<Record<string, any>>;
  customers?: Array<Record<string, any>>;
  bills?: Array<Record<string, any>>;
};

function toMap(items: Array<Record<string, any>> | undefined) {
  const map = new Map<string, any>();
  (items || []).forEach((item) => {
    if (item?._id) map.set(item._id, item);
  });
  return map;
}

export default function AdminDataHydrator({
  products,
  brands,
  categories,
  customers,
  bills,
}: AdminHydrationData) {
  if (typeof window !== "undefined") {
    (window as any).__SSR_DATA_HYDRATED__ = true;
  }

  useEffect(() => {
    const productsMap = toMap(products);
    const brandsMap = toMap(brands);
    const categoriesMap = toMap(categories);
    const usersMap = toMap(customers);
    const billsMap = toMap(bills);

    const productsByCategory = new Map<string, string[]>();
    const productsByBrand = new Map<string, string[]>();
    (products || []).forEach((product) => {
      const categoryId = product?.category?._id || product?.category?._ref;
      if (categoryId) {
        const list = productsByCategory.get(String(categoryId)) || [];
        if (!list.includes(product._id)) list.push(product._id);
        productsByCategory.set(String(categoryId), list);
      }
      const brandId = product?.brand?._id || product?.brand?._ref;
      if (brandId) {
        const list = productsByBrand.get(String(brandId)) || [];
        if (!list.includes(product._id)) list.push(product._id);
        productsByBrand.set(String(brandId), list);
      }
    });

    const billsByCustomer = new Map<string, string[]>();
    (bills || []).forEach((bill) => {
      const customerId = bill?.customer?._id || bill?.customer?._ref;
      if (customerId) {
        const list = billsByCustomer.get(String(customerId)) || [];
        if (!list.includes(bill._id)) list.push(bill._id);
        billsByCustomer.set(String(customerId), list);
      }
    });

    const usersByClerkId = new Map<string, string>();
    (customers || []).forEach((user) => {
      if (user?.clerkId && user?._id) {
        usersByClerkId.set(String(user.clerkId), String(user._id));
      }
    });

    useDataStore.setState({
      products: productsMap,
      brands: brandsMap,
      categories: categoriesMap,
      users: usersMap,
      bills: billsMap,
      productsByCategory,
      productsByBrand,
      billsByCustomer,
      usersByClerkId,
      lastSyncTime: new Date(),
      isLoading: false,
      error: null,
    });
  }, [products, brands, categories, customers, bills]);

  return null;
}
