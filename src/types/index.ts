// Core user and authentication types
export interface User {
  id: string;
  clerkId: string;
  customerId: string;
  secretKey: string;
  name: string;
  email?: string;
  phone: string;
  location: string;
  role: "admin" | "customer";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  customerId: string;
  secretKey: string;
}

export interface AuthState {
  user: User | null;
  role: "admin" | "customer" | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Customer types
export interface Customer {
  id: string;
  clerkId: string;
  name: string;
  phone: string;
  location: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  location: string;
}

// Brand types
export interface Brand {
  _id: string;
  _type: 'brand';
  name: string;
  slug: {
    current: string;
  };
  logo?: {
    asset: {
      _ref: string;
    };
  };
  description?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandData {
  name: string;
  description?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };
  isActive: boolean;
}

// Item and inventory types
export type ItemCategory =
  | "light"
  | "motor"
  | "pump"
  | "wire"
  | "switch"
  | "socket"
  | "mcb"
  | "other";

export type LightType =
  | "led"
  | "bulb"
  | "tubelight"
  | "panel"
  | "concealed"
  | "other";
export type Color =
  | "white"
  | "warm-white"
  | "cool-white"
  | "yellow"
  | "red"
  | "blue"
  | "green"
  | "multicolor";
export type Size =
  | "1ft"
  | "2ft"
  | "3ft"
  | "4ft"
  | "5ft"
  | "6ft"
  | "small"
  | "medium"
  | "large";
export type WireGauge =
  | "0.5mm"
  | "1mm"
  | "1.5mm"
  | "2.5mm"
  | "4mm"
  | "6mm"
  | "10mm"
  | "16mm"
  | "25mm";
export type Ampere =
  | "6A"
  | "10A"
  | "16A"
  | "20A"
  | "25A"
  | "32A"
  | "40A"
  | "63A"
  | "100A";

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  lightType?: LightType;
  color?: Color;
  size?: Size;
  watts?: number; // 0.5 to 2.0 kW
  wireGauge?: WireGauge;
  ampere?: Ampere;
  brand: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minimumStock: number;
  unit: string; // "piece", "meter", "box", etc.
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: "purchase" | "sale" | "adjustment";
  quantity: number;
  price: number;
  totalAmount: number;
  date: Date;
  notes?: string;
  createdBy: string;
}

export interface Item {
  id: string;
  name: string;
  price: number;
  category: ItemCategory;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateItemData {
  name: string;
  price: number;
  category: ItemCategory;
  description?: string;
}

// Bill and billing types
export type ServiceType = "repair" | "sale" | "custom";
export type LocationType = "shop" | "home";

export interface BillItem {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Bill {
  id: string;
  customerId: string;
  customerName: string;
  items: BillItem[];
  serviceType: ServiceType;
  locationType: LocationType;
  homeVisitFee: number;
  subtotal: number;
  totalAmount: number;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export interface CreateBillData {
  customerId: string;
  items: {
    itemId: string;
    quantity: number;
  }[];
  serviceType: ServiceType;
  locationType: LocationType;
  notes?: string;
}

// Sales and reporting types
export interface MonthlyData {
  month: string;
  sales: number;
  profit: number;
  billCount: number;
}

export interface SalesReport {
  totalSales: number;
  totalProfit: number;
  totalLoss: number;
  billCount: number;
  topCustomers: Customer[];
  topItems: Item[];
  salesByMonth: MonthlyData[];
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface SalesFilters {
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  serviceType?: ServiceType;
}

// Profile and settings types
export interface ProfileData {
  name: string;
  phone: string;
  location: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Form validation types
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

// Notification types
export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Socket.IO event types
export interface SocketEvents {
  // Client to server events
  "join-room": (userId: string) => void;
  "leave-room": (userId: string) => void;

  // Server to client events
  "bill-created": (bill: Bill) => void;
  "customer-updated": (customer: Customer) => void;
  notification: (notification: Notification) => void;
  connect: () => void;
  disconnect: () => void;
}

// Utility types
export type LoadingState = "idle" | "loading" | "success" | "error";

export interface AsyncState<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export interface FormProps extends BaseComponentProps {
  onSubmit: (data: unknown) => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
}
