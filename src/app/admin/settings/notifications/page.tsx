"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, Check, Trash2, Filter } from "lucide-react";

interface AppNotification {
  id: string;
  type: "billing" | "inventory" | "system";
  title: string;
  body: string;
  createdAt: string; // ISO string
  read?: boolean;
}

export default function NotificationsSettingsPage() {
  const router = useRouter();

  // Placeholder notifications list
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "n1",
      type: "billing",
      title: "Payment received",
      body: "Invoice INV-1023 has been paid.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "n2",
      type: "inventory",
      title: "Low stock alert",
      body: "Capacitor 100uF is below threshold.",
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: "n3",
      type: "system",
      title: "Backup completed",
      body: "Nightly backup finished successfully.",
      createdAt: new Date(Date.now() - 86_400_000).toISOString(),
      read: true,
    },
  ]);

  const [filter, setFilter] = useState<"all" | AppNotification["type"]>("all");
  const filtered = notifications.filter((n) => (filter === "all" ? true : n.type === filter));

  const markAsRead = (id: string) =>
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const clearAll = () => setNotifications([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Notifications</h1>
          <p className="text-gray-400 mt-1">Manage notification preferences and view all in-app notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preferences */}
        <Card className="bg-gray-900 border-gray-800 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bell className="w-5 h-5" /> Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Email for alerts</Label>
              <Input className="bg-gray-800 border-gray-700 text-white" placeholder="alerts@shop.com" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
              <Button size="sm" variant={filter === "billing" ? "default" : "outline"} onClick={() => setFilter("billing")}>Billing</Button>
              <Button size="sm" variant={filter === "inventory" ? "default" : "outline"} onClick={() => setFilter("inventory")}>Inventory</Button>
              <Button size="sm" variant={filter === "system" ? "default" : "outline"} onClick={() => setFilter("system")}>System</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={clearAll} className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stream */}
        <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Notification Center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filtered.length === 0 && (
              <p className="text-gray-400 text-sm">No notifications</p>
            )}
            {filtered.map((n) => (
              <div key={n.id} className="flex items-start justify-between p-3 rounded-md bg-gray-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{n.type}</Badge>
                    {!n.read && <Badge className="bg-blue-600">New</Badge>}
                  </div>
                  <p className="text-white font-medium mt-1">{n.title}</p>
                  <p className="text-gray-400 text-sm">{n.body}</p>
                  <p className="text-gray-500 text-xs mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {!n.read && (
                    <Button size="sm" onClick={() => markAsRead(n.id)} className="flex items-center gap-1">
                      <Check className="w-4 h-4" /> Mark as read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
