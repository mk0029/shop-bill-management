"use client";

import { useAdminManagement } from "@/hooks/use-admin-management";
import { AdminManagementHeader } from "@/components/admin/admin-management-header";
import { AdminTable } from "@/components/admin/admin-table";
import { AdminModals } from "@/components/admin/admin-modals";

export default function ManageAdminsPage() {
  const {
    admins,
    isLoading,
    canManageAdmins,
    showAddModal,
    showDeleteModal,
    showCredentials,
    selectedAdmin,
    generatedCredentials,
    newAdminForm,
    errors,
    setShowAddModal,
    setShowCredentials,
    handleAddAdmin,
    handleDeleteAdmin,
    handleToggleAdminStatus,
    handleFormChange,
    openDeleteModal,
    closeDeleteModal,
    closeAddModal,
    getAdminRoleLabel,
    getAdminRoleColor,
    isSuperAdmin,
  } = useAdminManagement();

  // If user doesn't have permission, the hook will redirect
  if (!canManageAdmins) {
    return null;
  }

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter((admin: any) => admin.isActive).length;

  return (
    <div className="space-y-6 max-md:space-y-4 max-md:pb-4">
      <AdminManagementHeader
        totalAdmins={totalAdmins}
        activeAdmins={activeAdmins}
        onAddAdmin={() => setShowAddModal(true)}
      />

      <AdminTable
        admins={admins}
        isLoading={isLoading}
        onToggleStatus={handleToggleAdminStatus}
        onDeleteAdmin={openDeleteModal}
        getAdminRoleLabel={getAdminRoleLabel as any}
        getAdminRoleColor={getAdminRoleColor as any}
        isSuperAdmin={isSuperAdmin}
      />

      <AdminModals
        showAddModal={showAddModal}
        newAdminForm={newAdminForm}
        errors={errors}
        isLoading={isLoading}
        onCloseAddModal={closeAddModal}
        onFormChange={handleFormChange}
        onAddAdmin={handleAddAdmin}
        showDeleteModal={showDeleteModal}
        selectedAdmin={selectedAdmin}
        onCloseDeleteModal={closeDeleteModal}
        onDeleteAdmin={handleDeleteAdmin}
        showCredentials={showCredentials}
        generatedCredentials={generatedCredentials}
        onCloseCredentials={() => setShowCredentials(false)}
      />
    </div>
  );
}