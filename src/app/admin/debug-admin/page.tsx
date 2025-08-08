"use client";

import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  isAdminManagementEnabled,
  getSuperAdminEmail,
  isSuperAdmin,
  canManageAdmins,
} from "@/lib/admin-utils";
import { Shield, User, Settings, CheckCircle, XCircle } from "lucide-react";

export default function DebugAdminPage() {
  const { user: clerkUser } = useUser();

  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress;
  const adminManagementEnabled = isAdminManagementEnabled();
  const superAdminEmail = getSuperAdminEmail();
  const userIsSuperAdmin = isSuperAdmin(userEmail);
  const userCanManageAdmins = canManageAdmins(userEmail);

  return (
    <div className="min-h-screen bg-gray-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Debug Panel</h1>
            <p className="text-gray-400">
              Debug admin management configuration
            </p>
          </div>
        </div>

        {/* Environment Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Environment Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-300">Admin Management Enabled</span>
                <div className="flex items-center gap-2">
                  {adminManagementEnabled ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge
                    variant="outline"
                    className={
                      adminManagementEnabled
                        ? "text-green-400 border-green-400"
                        : "text-red-400 border-red-400"
                    }
                  >
                    {adminManagementEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-300">Super Admin Email Set</span>
                <div className="flex items-center gap-2">
                  {superAdminEmail ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <Badge
                    variant="outline"
                    className={
                      superAdminEmail
                        ? "text-green-400 border-green-400"
                        : "text-red-400 border-red-400"
                    }
                  >
                    {superAdminEmail ? "Set" : "Not Set"}
                  </Badge>
                </div>
              </div>
            </div>

            {superAdminEmail && (
              <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-200 text-sm">
                  <strong>Super Admin Email:</strong> {superAdminEmail}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current User Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">User Email</p>
                <p className="text-white font-medium">
                  {userEmail || "Not logged in"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-gray-400 text-sm">User Name</p>
                <p className="text-white font-medium">
                  {clerkUser?.fullName || clerkUser?.firstName || "Unknown"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-300">Is Super Admin</span>
                <Badge
                  variant="outline"
                  className={
                    userIsSuperAdmin
                      ? "text-purple-400 border-purple-400"
                      : "text-gray-400 border-gray-400"
                  }
                >
                  {userIsSuperAdmin ? "Yes" : "No"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-300">Can Manage Admins</span>
                <Badge
                  variant="outline"
                  className={
                    userCanManageAdmins
                      ? "text-green-400 border-green-400"
                      : "text-red-400 border-red-400"
                  }
                >
                  {userCanManageAdmins ? "Yes" : "No"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-300">Clerk User ID</span>
                <Badge
                  variant="outline"
                  className="text-blue-400 border-blue-400"
                >
                  {clerkUser?.id ? "Set" : "Not Set"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between p-2 bg-gray-800 rounded">
                <span className="text-gray-300">
                  NEXT_PUBLIC_ENABLE_ADMIN_MANAGEMENT
                </span>
                <span className="text-white">
                  {process.env.NEXT_PUBLIC_ENABLE_ADMIN_MANAGEMENT ||
                    "undefined"}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-gray-800 rounded">
                <span className="text-gray-300">
                  NEXT_PUBLIC_SUPER_ADMIN_EMAIL
                </span>
                <span className="text-white">
                  {process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "undefined"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Access Status */}
        <Card>
          <CardHeader>
            <CardTitle>Access Status</CardTitle>
          </CardHeader>
          <CardContent>
            {userCanManageAdmins ? (
              <div className="sm:p-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="text-green-200 font-medium">Access Granted</p>
                    <p className="text-green-300 text-sm">
                      You have permission to access the admin management panel.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="sm:p-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-red-500" />
                  <div>
                    <p className="text-red-200 font-medium">Access Denied</p>
                    <p className="text-red-300 text-sm">
                      {!adminManagementEnabled
                        ? "Admin management is disabled in environment configuration."
                        : !userIsSuperAdmin
                        ? "You are not configured as a super admin."
                        : "Unknown access restriction."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
