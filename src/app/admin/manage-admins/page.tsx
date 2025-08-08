"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Table } from "@/components/ui/table";
import { useDataStore } from "@/store/data-store";
import { sanityClient } from "@/lib/sanity";
import {
  isAdminManagementEnabled,
  getSuperAdminEmail,
  isSuperAdmin,
  generateAdminCredentials,
  getAdminRoleLabel,
  getAdminRoleColor,
  type AdminRole,
} from "@/lib/admin-utils";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldX,
  Trash2,
  Settings,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";

interface AdminUser {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "super_admin";
  isActive: boolean;
  createdAt: string;
  createdBy?: string;
  lastLogin?: string;
}

export default function ManageAdminsPage() {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const { users, createUser, updateUser } = useDataStore();

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "admin" as "admin" | "super_admin",
  });

  // Check if admin management is enabled and user permissions
  const adminManagementEnabled = isAdminManagementEnabled();
  const superAdminEmail = getSuperAdminEmail();
  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  const userIsSuperAdmin = isSuperAdmin(userEmail);

  useEffect(() => {
    if (!adminManagementEnabled) {
      router.push("/admin/dashboard");
      return;
    }

    if (!userIsSuperAdmin) {
      router.push("/admin/dashboard");
      return;
    }

    loadAdminUsers();
  }, [adminManagementEnabled, userIsSuperAdmin, router]);

  const loadAdminUsers = async () => {
    try {
      setIsLoading(true);
      const query = `*[_type == "user" && role in ["admin", "super_admin"]] {
        _id,
        clerkId,
        name,
        email,
        phone,
        role,
        isActive,
        createdAt,
        createdBy,
        lastLogin
      } | order(createdAt desc)`;

      const admins = await sanityClient.fetch(query);
      setAdminUsers(admins);
    } catch (error) {
      console.error("Failed to load admin users:", error);
      setError("Failed to load admin users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      // Generate admin credentials
      const { customerId, secretKey } = generateAdminCredentials();

      const adminData = {
        _type: "user",
        clerkId: `admin_${Date.now()}`, // Temporary clerk ID
        customerId,
        secretKey,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: "Admin Office",
        role: formData.role,
        isActive: true,
        createdBy: clerkUser?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newAdmin = await sanityClient.create(adminData);

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "admin",
      });

      setIsCreateModalOpen(false);
      await loadAdminUsers();

      alert(
        `Admin created successfully!\nEmail: ${formData.email}\nTemporary Password: Please set up via Clerk`
      );
    } catch (error) {
      console.error("Failed to create admin:", error);
      alert("Failed to create admin. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      await sanityClient
        .patch(adminId)
        .set({
          isActive: !currentStatus,
          updatedAt: new Date().toISOString(),
        })
        .commit();

      await loadAdminUsers();
    } catch (error) {
      console.error("Failed to toggle admin status:", error);
      alert("Failed to update admin status");
    }
  };

  const deleteAdmin = async (adminId: string, adminEmail: string) => {
    if (adminEmail === superAdminEmail) {
      alert("Cannot delete super admin account");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this admin? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await sanityClient.delete(adminId);
      await loadAdminUsers();
    } catch (error) {
      console.error("Failed to delete admin:", error);
      alert("Failed to delete admin");
    }
  };

  if (!adminManagementEnabled) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <ShieldX className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Feature Disabled
            </h2>
            <p className="text-gray-400">
              Admin management is currently disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userIsSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">
              Only super admins can manage admin accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-blue-500" />
              Admin Management
            </h1>
            <p className="text-gray-400 mt-1">
              Manage admin users and their permissions
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Badge
              variant="outline"
              className="text-green-500 border-green-500"
            >
              <Shield className="h-3 w-3 mr-1" />
              Super Admin
            </Badge>

            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Admin
            </Button>
          </div>
        </div>

        {/* Warning Banner */}
        <Card className="border-yellow-500/20 bg-yellow-900/10">
          <CardContent className="sm:p-4 p-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-yellow-200 font-medium">Security Notice</p>
                <p className="text-yellow-300 text-sm">
                  Admin management is enabled. Only create admin accounts for
                  trusted users.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Admin Users ({adminUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center p-8">
                <p className="text-red-400">{error}</p>
                <Button onClick={loadAdminUsers} className="mt-4">
                  Retry
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left p-3 text-gray-300">Name</th>
                      <th className="text-left p-3 text-gray-300">Email</th>
                      <th className="text-left p-3 text-gray-300">Phone</th>
                      <th className="text-left p-3 text-gray-300">Role</th>
                      <th className="text-left p-3 text-gray-300">Status</th>
                      <th className="text-left p-3 text-gray-300">Created</th>
                      <th className="text-left p-3 text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((admin) => (
                      <tr key={admin._id} className="border-b border-gray-800">
                        <td className="p-3">
                          <div className="font-medium text-white">
                            {admin.name}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-gray-300">{admin.email}</div>
                          {admin.email === superAdminEmail && (
                            <Badge
                              variant="outline"
                              className="text-xs mt-1 text-purple-400 border-purple-400"
                            >
                              Super Admin
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-gray-300">{admin.phone}</td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              admin.role === "super_admin"
                                ? "text-purple-400 border-purple-400"
                                : "text-blue-400 border-blue-400"
                            }
                          >
                            {admin.role === "super_admin"
                              ? "Super Admin"
                              : "Admin"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={
                              admin.isActive
                                ? "text-green-400 border-green-400"
                                : "text-red-400 border-red-400"
                            }
                          >
                            {admin.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-300 text-sm">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                toggleAdminStatus(admin._id, admin.isActive)
                              }
                              className="text-xs"
                            >
                              {admin.isActive ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>

                            {admin.email !== superAdminEmail && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  deleteAdmin(admin._id, admin.email)
                                }
                                className="text-xs text-red-400 border-red-400 hover:bg-red-900/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {adminUsers.length === 0 && (
                  <div className="text-center p-8 text-gray-400">
                    No admin users found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Admin Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Admin"
        >
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter admin's full name"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter admin's email"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Enter phone number"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Admin Role
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as "admin" | "super_admin",
                  })
                }
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded p-3">
              <p className="text-yellow-200 text-sm">
                <strong>Note:</strong> The admin will need to set up their
                account via Clerk authentication system.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Creating..." : "Create Admin"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
