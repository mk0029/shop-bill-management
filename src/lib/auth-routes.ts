import type { Role } from "@/lib/rbac";

export const STAFF_WELCOME_ROUTE = "/admin/welcome";
export const CUSTOMER_WELCOME_ROUTE = "/customer/welcome";

export function isStaffRole(role: Role | string | null | undefined): boolean {
  return role === "admin" || role === "super_admin" || role === "technician";
}

export function getAuthenticatedHomeRoute(
  role: Role | string | null | undefined,
): string {
  if (role === "customer") return "/customer";
  if (role === "technician") return "/dashboard/work-list";
  if (role === "admin" || role === "super_admin") return "/admin";
  return "/";
}

export function getWelcomeRoute(role: Role | string | null | undefined): string {
  return isStaffRole(role) ? STAFF_WELCOME_ROUTE : CUSTOMER_WELCOME_ROUTE;
}
