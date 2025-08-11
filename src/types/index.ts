/* eslint-disable @typescript-eslint/no-explicit-any */
// Core entity types
export interface User {
  _id: string;
  id: string;
  clerkId: string;
  customerId: string;
  secretKey: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  profileImage?: string;
  role: "admin" | "customer";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  customerId: string;
  name: string;
  phone: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  id?: string;
  productId: string;
  price?: number;
  name: string;
  slug: string;
  brand: {
    _id: string;
    name: string;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  description?: string;
  specifications: Record<string, any>;
  pricing: {
    basePrice: number;
    salePrice?: number;
    costPrice: number;
    sellingPrice?: number;
    purchasePrice?: number;
  };
  inventory: {
    currentStock: number;
    minStockLevel: number;
    maxStockLevel: number;
    reorderPoint: number;
    minimumStock?: number;
    maximumStock?: number;
  };
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  isActive: boolean;
  sortOrder: number;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  parentCategory?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  _id: string;
  billId: string;
  billNumber: string;
  customer: Customer;
  items: BillItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  paymentStatus: "paid" | "pending" | "overdue";
  paymentMethod?: string;
  notes?: string;
  serviceLocation?: string;
  dueDate?: string;
  paidDate?: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillItem {
  _id: string;
  id?: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  price?: number;
  total?: number;
  specifications?: Record<string, any>;
}

export interface StockTransaction {
  _id: string;
  id?: string;
  product: {
    _id: string;
    name: string;
  };
  type: "in" | "out" | "adjustment";
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  transactionDate: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

// Form data types
export interface LoginCredentials {
  customerId: string;
  secretKey: string;
}

export interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  profileImage?: string;
}

export interface CreateBrandData {
  name: string;
  description?: string;
  logo?: string;
  isActive: boolean;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  location: string;
}

export interface BillFormData {
  customer: Customer | null;
  customerId?: string;
  items: BillItem[];
  serviceLocation?: string;
  serviceType?: string;
  locationType?: string;
  notes?: string;
  dueDate?: string;
  paymentMethod?: string;
}

// UI component types
export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ActionButtonProps {
  onClick: () => void | Promise<void>;
  children: React.ReactNode;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "primary";
  size?: "default" | "sm" | "lg" | "icon" | "md";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "textarea";
  disabled?: boolean;
}

// Dashboard and analytics types
export interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  totalBills: number;
  totalRevenue: number;
  pendingBills: number;
  lowStockItems: number;
}

export interface InventoryValue {
  productId: string;
  name: string;
  brand: string;
  currentStock: number;
  unitPrice: number;
  totalValue: number;
}

export interface StockAlert {
  _id: string;
  productId: string;
  productName: string;
  brand: string;
  brandName?: string;
  currentStock: number;
  minStockLevel: number;
  minimumStock?: number;
  alertType: "low_stock" | "out_of_stock" | "overstock";
  severity: "low" | "medium" | "high" | "critical";
  createdAt: string;
}

export interface AlertData {
  _id: string;
  type: "stock" | "payment" | "system";
  title: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  isRead: boolean;
  createdAt: string;
  totalAlerts: any;
  inventory: any;
  bills: any;
}

// Inventory summary type
export interface InventorySummary {
  totalProducts: number;
  totalItems?: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  topValueProducts: InventoryValue[];
  breakdown?: unknown[];
}

// Generic API response type
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Utility types
export type Item = Product;
