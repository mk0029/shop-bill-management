// Global type declarations to handle type mismatches

declare global {
  interface Window {
    btoa: (str: string) => string;
  }
}

// Extend existing types to be more flexible
declare module "@/types" {
  interface Product {
    pricing: {
      basePrice?: number;
      salePrice?: number;
      costPrice?: number;
      sellingPrice?: number;
      purchasePrice?: number;
      standardPrice?: number;
      modularPrice?: number;
      unit?: string;
      mrp?: number;
      discount?: number;
      taxRate?: number;
    };
    slug: string | { current: string };
    category: {
      _id: string;
      name: string;
      slug: string | { current: string };
      description?: string;
      icon?: string;
      parentCategory?: any;
      isActive: boolean;
      sortOrder: number;
    };
  }

  interface User {
    updatedAt?: string;
  }

  interface Customer {
    id?: string;
    _ref?: string;
  }

  interface BillItem {
    name?: string;
    price?: number;
    total?: number;
  }

  interface StockTransaction {
    itemName?: string;
    date?: string;
    price?: number;
    updatedAt?: string;
  }
}

export {};
