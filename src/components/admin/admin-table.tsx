"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldCheck, ShieldX, Trash2, Settings } from "lucide-react";

interface AdminTableProps {
  admins: any[];
  isLoading: boolean;
  onToggleStatus: (admin: any) => void;
  onDeleteAdmin: (admin: any) => void;
  getAdminRoleLabel: (role: string) => string;
  getAdminRoleColor: (role: string) => string;
  isSuperAdmin: (email: string) => boolean;
}

export const AdminTable = ({
  admins,
  isLoading,
  onToggleStatus,
  onDeleteAdmin,
  getAdminRoleLabel,
  getAdminRoleColor,
  isSuperAdmin,
}: AdminTableProps) => {
  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-400">Loading admins...</span>
        </div>
      </div>
    );
  }

  if (admins.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No Admins Found
          </h3>
          <p className="text-gray-400">
            Start by adding your first admin user.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {admins.map((admin) => (
              <tr key={admin._id} className="hover:bg-gray-800/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      {admin.role === "super_admin" ? (
                        <ShieldCheck className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <Shield className="w-4 h-4 text-blue-400" />
                      )}
                      {admin.name}
                    </div>
                    <div className="text-sm text-gray-400">{admin.email}</div>
                    <div className="text-sm text-gray-400">{admin.phone}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={getAdminRoleColor(admin.role)}>
                    {getAdminRoleLabel(admin.role)}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    className={
                      admin.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }>
                    {admin.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {new Date(admin.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {admin.lastLogin
                    ? new Date(admin.lastLogin).toLocaleDateString()
                    : "Never"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleStatus(admin)}
                      className={
                        admin.isActive
                          ? "text-red-400 hover:text-red-300"
                          : "text-green-400 hover:text-green-300"
                      }
                      disabled={isSuperAdmin(admin.email)}>
                      {admin.isActive ? (
                        <ShieldX className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteAdmin(admin)}
                      className="text-red-400 hover:text-red-300"
                      disabled={isSuperAdmin(admin.email)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
