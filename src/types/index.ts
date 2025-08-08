// Core entity types
export interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface BillFormData {
  customerId: string;
  serviceType: string;
  locationType: string;
  items: BillItem[];
  notes: string;
}

// Inventory types
export interface StockAlert {
  productId: string;
  productName: string;
  brandName: string;
  currentStock: number;
  minimumStock: number;
  alertLevel: "out_of_stock" | "low_stock" | "reorder_needed";
}

export interface InventoryValue {
  totalValue: number;
  totalItems: number;
  breakdown: ProductValue[];
}

export interface ProductValue {
  productId: string;
  name: string;
  brand: string;
  stock: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
}

// Form types
export interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export interface DropdownOption {
  value: string;
  label: string;
}

// Dashboard types
export interface DashboardStats {
  products: {
    total: number;
    active: number;
  };
  users: {
    total: number;
    customers: number;
  };
  bills: {
    total: number;
    pending: number;
    completed: number;
    totalRevenue: number;
  };
}

export interface AlertData {
  totalAlerts: number;
  inventory: {
    lowStockCount: number;
    outOfStockCount: number;
    lowStock: any[];
    outOfStock: any[];
  };
  bills: {
    overdueCount: number;
    overdue: any[];
  };
}
