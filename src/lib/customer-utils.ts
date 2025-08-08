import type { Customer, CustomerWithStats } from "@/types/customer";

/**
 * Formats customer display name with fallback
 */
export function formatCustomerName(customer: Customer): string {
  return customer.name || "Unknown Customer";
}

/**
 * Formats customer phone number
 */
export function formatCustomerPhone(phone: string): string {
  // Basic phone formatting - can be enhanced based on locale
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
}

/**
 * Gets customer initials for avatar display
 */
export function getCustomerInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Determines customer status color
 */
export function getCustomerStatusColor(isActive: boolean): {
  bg: string;
  text: string;
} {
  return isActive
    ? { bg: "bg-green-900", text: "text-green-300" }
    : { bg: "bg-red-900", text: "text-red-300" };
}

/**
 * Formats customer activity summary
 */
export function formatCustomerActivity(
  customer: CustomerWithStats,
  currency: string
): string {
  const billText = customer.totalBills === 1 ? "bill" : "bills";
  return `${
    customer.totalBills
  } ${billText} • ${currency}${customer.totalSpent.toLocaleString()}`;
}

/**
 * Formats last bill date
 */
export function formatLastBillDate(lastBillDate: string | null): string {
  if (!lastBillDate) return "No bills yet";

  const date = new Date(lastBillDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return lastBillDate;
}

/**
 * Validates customer data
 */
export function validateCustomerData(customer: Partial<Customer>): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!customer.name?.trim()) {
    errors.name = "Customer name is required";
  }

  if (!customer.phone?.trim()) {
    errors.phone = "Phone number is required";
  } else if (!/^\d{10}$/.test(customer.phone.replace(/\D/g, ""))) {
    errors.phone = "Please enter a valid 10-digit phone number";
  }

  if (!customer.location?.trim()) {
    errors.location = "Location is required";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sorts customers by various criteria
 */
export function sortCustomers(
  customers: CustomerWithStats[],
  sortBy: "name" | "totalBills" | "totalSpent" | "lastBill" | "createdAt",
  order: "asc" | "desc" = "asc"
): CustomerWithStats[] {
  return [...customers].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "totalBills":
        comparison = a.totalBills - b.totalBills;
        break;
      case "totalSpent":
        comparison = a.totalSpent - b.totalSpent;
        break;
      case "lastBill":
        const aDate = a.lastBillDate ? new Date(a.lastBillDate).getTime() : 0;
        const bDate = b.lastBillDate ? new Date(b.lastBillDate).getTime() : 0;
        comparison = aDate - bDate;
        break;
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }

    return order === "desc" ? -comparison : comparison;
  });
}
