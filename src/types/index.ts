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

// Service and location types
export type ServiceType = "sale" | "repair" | "maintenance";
export type LocationType = "shop" | "home";

// UI Component types
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

// Modal and Dialog types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
}

// Stats and metrics types
export interface StatCardData {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
    period: string;
  };
  icon?: React.ReactNode;
  loading?: boolean;
  error?: string;
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

export interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  brand?: string;
}

export interface OutOfStockItem {
  id: string;
  name: string;
  brand?: string;
  lastStockDate?: string;
}

export interface OverdueBill {
  id: string;
  customerName: string;
  amount: number;
  dueDate: string;
  daysPastDue: number;
}

export interface AlertData {
  totalAlerts: number;
  inventory: {
    lowStockCount: number;
    outOfStockCount: number;
    lowStock: LowStockItem[];
    outOfStock: OutOfStockItem[];
  };
  bills: {
    overdueCount: number;
    overdue: OverdueBill[];
  };
}
