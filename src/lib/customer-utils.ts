import type { Customer, CustomerWithStats } from "@/types/customer";

const BRACKET_REGEX = /\s*[\[({]([^\]})]+)[\]})]\s*$/;

export function cleanCustomerNameInput(name: string) {
  return name
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/\s*\{[^}]*\}\s*/g, "")
    .replace(/\s*\[[^\]]*\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractNicknameFromBrackets(name: string) {
  const match = name.match(BRACKET_REGEX);
  return match ? match[1].trim() : "";
}

export function splitNameAndNickname(name: string) {
  const nickname = extractNicknameFromBrackets(name);
  const cleanName = nickname ? cleanCustomerNameInput(name) : name.trim();
  return { cleanName, nickname };
}

export function getAdminCustomerDisplayName(customer: {
  name?: string;
  nickname?: string;
}): string {
  const name = customer?.name?.trim() || "Unknown Customer";
  const nickname = customer?.nickname?.trim();
  return nickname ? `${name} (${nickname})` : name;
}

export function getCustomerDisplayName(customer: {
  name?: string;
}): string {
  return customer?.name?.trim() || "Unknown Customer";
}

export function formatCustomerName(customer: Customer): string {
  return customer.nickname?.trim() || customer.name || "Unknown Customer";
}

export function formatCustomerPhone(phone: string): string {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
}

export function getCustomerInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getCustomerStatusColor(isActive: boolean): {
  bg: string;
  text: string;
} {
  return isActive
    ? { bg: "bg-green-900", text: "text-green-300" }
    : { bg: "bg-red-900", text: "text-red-300" };
}

export function formatCustomerActivity(
  customer: CustomerWithStats,
  currency: string
): string {
  const totalPending = customer.pendingAmount + customer.partialAmount;
  if (totalPending > 0) {
    return `${currency}${totalPending.toLocaleString()} pending`;
  }
  return `All Paid`;
}

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
