/**
 * Utility functions for admin management
 */

export const isAdminManagementEnabled = (): boolean => {
  return process.env.NEXT_PUBLIC_ENABLE_ADMIN_MANAGEMENT === "true";
};

export const getSuperAdminEmail = (): string | undefined => {
  return process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
};

export const isSuperAdmin = (userEmail?: string): boolean => {
  if (!userEmail) return false;
  const superAdminEmail = getSuperAdminEmail();
  return superAdminEmail === userEmail;
};

export const canManageAdmins = (userEmail?: string): boolean => {
  return isAdminManagementEnabled() && isSuperAdmin(userEmail);
};

// Generate secure admin credentials
export const generateAdminCredentials = () => {
  const customerId = Buffer.from(
    Date.now().toString() + Math.random().toString()
  ).toString("base64");
  const secretKey = Buffer.from(
    Date.now().toString() + Math.random().toString()
  ).toString("base64");

  return {
    customerId,
    secretKey,
  };
};

// Admin role types
export type AdminRole = "admin" | "super_admin";

export const getAdminRoleLabel = (role: AdminRole): string => {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    default:
      return "Unknown";
  }
};

export const getAdminRoleColor = (role: AdminRole): string => {
  switch (role) {
    case "super_admin":
      return "text-purple-400 border-purple-400";
    case "admin":
      return "text-blue-400 border-blue-400";
    default:
      return "text-gray-400 border-gray-400";
  }
};
