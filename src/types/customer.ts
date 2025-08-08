export interface Customer {
  _id: string;
  clerkId: string;
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerWithStats extends Customer {
  totalBills: number;
  totalSpent: number;
  lastBillDate: string | null;
}

export interface CustomerFilters {
  searchTerm: string;
  filterActive: "all" | "active" | "inactive";
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  totalBills: number;
  totalRevenue: number;
}
