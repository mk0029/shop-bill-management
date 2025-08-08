import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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

export const useAdminManagement = () => {
  const router = useRouter();
  const { user: clerkUser } = useUser();
  const { users: admins, fetchUsers: fetchAdmins } = useDataStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const [newAdminForm, setNewAdminForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "admin" as AdminRole,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if admin management is enabled and user has permission
  const canManageAdmins =
    isAdminManagementEnabled() &&
    clerkUser?.emailAddresses?.[0]?.emailAddress === getSuperAdminEmail();

  useEffect(() => {
    if (!canManageAdmins) {
      router.push("/admin/dashboard");
      return;
    }

    const loadAdmins = async () => {
      setIsLoading(true);
      try {
        await fetchAdmins();
      } catch (error) {
        console.error("Error loading admins:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdmins();
  }, [canManageAdmins, fetchAdmins, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!newAdminForm.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!newAdminForm.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newAdminForm.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!newAdminForm.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    // Check if email already exists
    const emailExists = admins.some(
      (admin) => admin.email.toLowerCase() === newAdminForm.email.toLowerCase()
    );
    if (emailExists) {
      newErrors.email = "An admin with this email already exists";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddAdmin = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // Generate credentials
      const credentials = {
        email: newAdminForm.email,
        password: Math.random().toString(36).slice(-8),
      };

      // Create admin in Sanity
      const newAdmin = await sanityClient.create({
        _type: "admin",
        name: newAdminForm.name,
        email: newAdminForm.email,
        phone: newAdminForm.phone,
        role: newAdminForm.role,
        isActive: true,
        createdBy: clerkUser?.id,
        createdAt: new Date().toISOString(),
        // Store hashed password or reference to Clerk user
        clerkId: "", // This would be set after Clerk user creation
      });

      // Show generated credentials
      setGeneratedCredentials(credentials);
      setShowCredentials(true);
      setShowAddModal(false);

      // Reset form
      setNewAdminForm({
        name: "",
        email: "",
        phone: "",
        role: "admin",
      });

      // Refresh admins list
      await fetchAdmins();
    } catch (error) {
      console.error("Error creating admin:", error);
      setErrors({ general: "Failed to create admin. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      setIsLoading(true);

      // Delete from Sanity
      await sanityClient.delete(selectedAdmin._id);

      // Close modal
      setShowDeleteModal(false);
      setSelectedAdmin(null);

      // Refresh admins list
      await fetchAdmins();
    } catch (error) {
      console.error("Error deleting admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAdminStatus = async (admin: AdminUser) => {
    try {
      await sanityClient
        .patch(admin._id)
        .set({ isActive: !admin.isActive })
        .commit();

      // Refresh admins list
      await fetchAdmins();
    } catch (error) {
      console.error("Error updating admin status:", error);
    }
  };

  const handleFormChange = (field: string, value: string) => {
    setNewAdminForm((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const openDeleteModal = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setSelectedAdmin(null);
    setShowDeleteModal(false);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewAdminForm({
      name: "",
      email: "",
      phone: "",
      role: "admin",
    });
    setErrors({});
  };

  return {
    // Data
    admins,
    isLoading,
    canManageAdmins,

    // Modals
    showAddModal,
    showDeleteModal,
    showCredentials,
    selectedAdmin,
    generatedCredentials,

    // Form
    newAdminForm,
    errors,

    // Actions
    setShowAddModal,
    setShowCredentials,
    handleAddAdmin,
    handleDeleteAdmin,
    handleToggleAdminStatus,
    handleFormChange,
    openDeleteModal,
    closeDeleteModal,
    closeAddModal,

    // Utilities
    getAdminRoleLabel,
    getAdminRoleColor,
    isSuperAdmin,
  };
};
