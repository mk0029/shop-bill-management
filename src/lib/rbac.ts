export type Role = "customer" | "admin" | "super_admin" | "technician";

export type Permission =
  | "VIEW_BILL"
  | "CREATE_BILL"
  | "UPDATE_BILL_STATUS"
  | "EDIT_BILL"
  | "OVERRIDE_BILL_STATUS"
  | "VIEW_AUDIT_LOGS"
  | "ACCESS_SUPER_SETTINGS";

const rolePermissions: Record<Role, readonly Permission[]> = {
  customer: [],
  admin: ["VIEW_BILL", "CREATE_BILL", "UPDATE_BILL_STATUS"],
  technician: ["VIEW_BILL", "CREATE_BILL", "UPDATE_BILL_STATUS"],
  super_admin: [
    "VIEW_BILL",
    "CREATE_BILL",
    "UPDATE_BILL_STATUS",
    "EDIT_BILL",
    "OVERRIDE_BILL_STATUS",
    "VIEW_AUDIT_LOGS",
    "ACCESS_SUPER_SETTINGS",
  ],
};

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = rolePermissions[role];
  return Array.isArray(perms) && perms.includes(permission);
}

export function isAdminLike(role: Role | null | undefined): boolean {
  return role === "admin" || role === "super_admin" || role === "technician";
}

export function isSuperAdmin(role: Role | null | undefined): boolean {
  return role === "super_admin";
}
