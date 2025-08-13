"use client";

import { Button } from "@/components/ui/button";
import { Shield, UserPlus } from "lucide-react";

interface AdminManagementHeaderProps {
  totalAdmins: number;
  activeAdmins: number;
  onAddAdmin: () => void;
}

export const AdminManagementHeader = ({
  totalAdmins,
  activeAdmins,
  onAddAdmin,
}: AdminManagementHeaderProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Manage Admins
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Add, remove, and manage administrator accounts
          </p>
        </div>
        <Button
          onClick={onAddAdmin}
          className="bg-blue-600 hover:bg-blue-700 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Admins</p>
              <p className="text-xl font-semibold text-white">{totalAdmins}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Admins</p>
              <p className="text-xl font-semibold text-white">{activeAdmins}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Inactive Admins</p>
              <p className="text-xl font-semibold text-white">
                {totalAdmins - activeAdmins}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
