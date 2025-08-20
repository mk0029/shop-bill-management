"use client";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Shield, Bell, ArrowRight, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

export default function SettingsPage() {
  const router = useRouter();
  const { refreshData } = useRealtimeSync({
    enableNotifications: false,
    enableAutoRefresh: true,
    documentTypes: ["bill", "product", "stockTransaction"],
  });

  const settingsOptions = [
    {
      title: "User Profile",
      description: "Manage your account settings and preferences",
      icon: User,
      href: "/admin/settings/profile",
      color: "text-blue-500",
    },
    {
      title: "Security",
      description: "Password, authentication, and security settings",
      icon: Shield,
      href: "/admin/settings/security",
      color: "text-red-500",
    },
    {
      title: "Notifications",
      description: "Email, SMS, and push notification settings",
      icon: Bell,
      href: "/admin/settings/notifications",
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Settings
          </h1>
          <p className="text-gray-400 mt-1">
            Configure your application preferences and business settings
          </p>
        </div>
        <Button variant="outline" onClick={() => refreshData()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Card
              key={option.title}
              className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer"
              onClick={() => router.push(option.href)}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${option.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {option.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions removed as requested */}
    </div>
  );
}
