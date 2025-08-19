"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dropdown } from "@/components/ui/dropdown";
import { UserPlus, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface AdminModalsProps {
  // Add Admin Modal
  showAddModal: boolean;
  newAdminForm: any;
  errors: Record<string, string>;
  isLoading: boolean;
  onCloseAddModal: () => void;
  onFormChange: (field: string, value: string) => void;
  onAddAdmin: () => void;

  // Delete Modal
  showDeleteModal: boolean;
  selectedAdmin: any;
  onCloseDeleteModal: () => void;
  onDeleteAdmin: () => void;

  // Credentials Modal
  showCredentials: boolean;
  generatedCredentials: { email: string; password: string } | null;
  onCloseCredentials: () => void;
}

export const AdminModals = ({
  showAddModal,
  newAdminForm,
  errors,
  isLoading,
  onCloseAddModal,
  onFormChange,
  onAddAdmin,
  showDeleteModal,
  selectedAdmin,
  onCloseDeleteModal,
  onDeleteAdmin,
  showCredentials,
  generatedCredentials,
  onCloseCredentials,
}: AdminModalsProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      {/* Add Admin Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={onCloseAddModal}
        title="Add New Admin">
        <div className="space-y-4">
          {errors.general && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-gray-300">Full Name *</Label>
            <Input
              value={newAdminForm.name}
              onChange={(e) => onFormChange("name", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter admin's full name"
            />
            {errors.name && (
              <p className="text-red-400 text-sm">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Email Address *</Label>
            <Input
              type="email"
              value={newAdminForm.email}
              onChange={(e) => onFormChange("email", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter admin's email"
            />
            {errors.email && (
              <p className="text-red-400 text-sm">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Phone Number *</Label>
            <Input
              value={newAdminForm.phone}
              onChange={(e) => onFormChange("phone", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter admin's phone number"
            />
            {errors.phone && (
              <p className="text-red-400 text-sm">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Role *</Label>
            <Dropdown
              options={[
                { value: "admin", label: "Admin" },
                { value: "super_admin", label: "Super Admin" },
              ]}
              value={newAdminForm.role}
              onValueChange={(value) => onFormChange("role", value)}
              placeholder="Select Role"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={onCloseAddModal}
              disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={onAddAdmin}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Admin
                </div>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={onCloseDeleteModal}
        title="Delete Admin">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-white">Confirm Deletion</h3>
              <p className="text-sm text-gray-300 mt-1">
                Are you sure you want to delete "{selectedAdmin?.name}"? This
                action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onCloseDeleteModal}
              disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={onDeleteAdmin}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </div>
              ) : (
                "Delete Admin"
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generated Credentials Modal */}
      <Modal
        isOpen={showCredentials}
        onClose={onCloseCredentials}
        title="Admin Credentials Generated">
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
            <h3 className="font-medium text-white mb-2">
              Admin account created successfully!
            </h3>
            <p className="text-sm text-gray-300">
              Please save these credentials and share them securely with the new
              admin.
            </p>
          </div>

          {generatedCredentials && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-gray-300">Email</Label>
                <div className="p-3 bg-gray-800 border border-gray-700 rounded-md">
                  <code className="text-blue-400">
                    {generatedCredentials.email}
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Temporary Password</Label>
                <div className="relative">
                  <div className="p-3 bg-gray-800 border border-gray-700 rounded-md pr-12">
                    <code className="text-blue-400">
                      {showPassword
                        ? generatedCredentials.password
                        : "••••••••••••"}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white">
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-300">
              <strong>Important:</strong> The admin will need to change their
              password on first login. Make sure to share these credentials
              securely.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onCloseCredentials}
              className="bg-blue-600 hover:bg-blue-700">
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
