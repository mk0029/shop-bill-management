"use client";

import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function TestPage() {
  const { user, role, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
          Authentication Test Page
        </h1>
        <p className="text-gray-400 mt-1">
          This page tests if authentication is working properly
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Authentication Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">Authenticated:</p>
              <p className="text-white font-semibold">
                {isAuthenticated ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Role:</p>
              <p className="text-white font-semibold">{role || "None"}</p>
            </div>
          </div>

          {user && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">User Details:</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-400">ID:</span> {user.id}
                </p>
                <p>
                  <span className="text-gray-400">Name:</span> {user.name}
                </p>
                <p>
                  <span className="text-gray-400">Phone:</span> {user.phone}
                </p>
                <p>
                  <span className="text-gray-400">Location:</span>{" "}
                  {user.location}
                </p>
                <p>
                  <span className="text-gray-400">Role:</span> {user.role}
                </p>
                <p>
                  <span className="text-gray-400">Active:</span>{" "}
                  {user.isActive ? "Yes" : "No"}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
            <Button onClick={() => router.push("/admin/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 