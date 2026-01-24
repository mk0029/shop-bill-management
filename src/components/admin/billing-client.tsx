"use client";

import AdminDataHydrator from "@/components/admin/admin-data-hydrator";
import { BillingBrowser } from "@/components/billing/billing-browser";

export type AdminBillingClientProps = {
  bills: Array<Record<string, any>>;
  customers: Array<Record<string, any>>;
  products: Array<Record<string, any>>;
  brands: Array<Record<string, any>>;
  categories: Array<Record<string, any>>;
};

export default function AdminBillingClient({
  bills,
  customers,
  products,
  brands,
  categories,
}: AdminBillingClientProps) {
  return (
    <>
      <AdminDataHydrator
        bills={bills}
        customers={customers}
        products={products}
        brands={brands}
        categories={categories}
      />
      <BillingBrowser />
    </>
  );
}
