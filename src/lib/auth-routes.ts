import type { Role } from "@/lib/rbac";

export const TECHNICIAN_ADMIN_HOME = "/admin/billing";
export const STAFF_WELCOME_ROUTE = "/admin/welcome";
export const CUSTOMER_WELCOME_ROUTE = "/customer/welcome";
export const CUSTOMER_HOME_ROUTE = "/customer/bills";

export function isStaffRole(role: Role | string | null | undefined): boolean {
  return role === "admin" || role === "super_admin" || role === "technician";
}

export function getAdminHomeRoute(role: Role | string | null | undefined): string {
  if (role === "technician") return TECHNICIAN_ADMIN_HOME;
  return "/admin/dashboard";
}

export function getAuthenticatedHomeRoute(
  role: Role | string | null | undefined,
): string {
  if (role === "customer") return CUSTOMER_HOME_ROUTE;
  if (isStaffRole(role)) return getAdminHomeRoute(role);
  return "/";
}

export function getWelcomeRoute(role: Role | string | null | undefined): string {
  return isStaffRole(role) ? STAFF_WELCOME_ROUTE : CUSTOMER_WELCOME_ROUTE;
}
