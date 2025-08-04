"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { useLocaleStore } from "@/store/locale-store";
import {
  FileText,
  DollarSign,
  Calendar,
  MapPin,
  Phone,
  Eye,
  Clock,
} from "lucide-react";
import Link from "next/link";

// Mock data - will be replaced with real data from Sanity
const mockCustomerData = {
  totalBills: 12,
  totalSpent: 25000,
  lastBillDate: "2025-01-15",
  recentBills: [
    {
      id: "1",
      amount: 2500,
      date: "2025-01-15",
      items: ["LED Bulbs", "Switch Installation"],
      serviceType: "home",
      status: "paid",
    },
    {
      id: "2",
      amount: 1800,
      date: "2025-01-10",
      items: ["Fan Repair", "Wiring Check"],
      serviceType: "shop",
      status: "paid",
    },
    {
      id: "3",
      amount: 3200,
      date: "2025-01-05",
      items: ["Complete Rewiring"],
      serviceType: "home",
      status: "paid",
    },
  ],
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: any;
  subtitle?: string;
}) => (
  <Card className="p-6 bg-gray-900 border-gray-800">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
    </div>
  </Card>
);

export default function CustomerHome() {
  const { user } = useAuthStore();
  const { currency } = useLocaleStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user?.name || "Customer"}!
          </h1>
          <p className="text-gray-400 mt-1">
            Here's an overview of your account and recent activity
          </p>
        </div>
        <Link href="/customer/book">
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            View All Bills
          </Button>
        </Link>
      </div>

      {/* Customer Info Card */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-4">
          Account Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {user?.name?.charAt(0) || "C"}
              </span>
            </div>
            <div>
              <p className="text-white font-medium">
                {user?.name || "Customer Name"}
              </p>
              <p className="text-gray-400 text-sm">
                Customer ID: {user?.clerkId || "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-white">{user?.phone || "Not provided"}</p>
              <p className="text-gray-400 text-sm">Phone Number</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-white">{user?.location || "Not provided"}</p>
              <p className="text-gray-400 text-sm">Location</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Bills"
          value={mockCustomerData.totalBills}
          icon={FileText}
          subtitle="All time"
        />
        <StatCard
          title="Total Spent"
          value={`${currency}${mockCustomerData.totalSpent.toLocaleString()}`}
          icon={DollarSign}
          subtitle="All time"
        />
        <StatCard
          title="Last Service"
          value={mockCustomerData.lastBillDate}
          icon={Calendar}
          subtitle="Most recent bill"
        />
      </div>

      {/* Recent Bills */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Bills</h2>
          <Link href="/customer/book">
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </Link>
        </div>
        <div className="space-y-3">
          {mockCustomerData.recentBills.map((bill, index) => (
            <motion.div
              key={bill.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-gray-800 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">
                    {currency}
                    {bill.amount.toLocaleString()}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      bill.serviceType === "home"
                        ? "bg-blue-900 text-blue-300"
                        : "bg-green-900 text-green-300"
                    }`}
                  >
                    {bill.serviceType === "home"
                      ? "Home Service"
                      : "Shop Service"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Calendar className="w-4 h-4" />
                  {bill.date}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-300 text-sm">
                    {bill.items.join(", ")}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-900 text-green-300">
                  {bill.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/customer/book">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <FileText className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">View Billing History</p>
                <p className="text-sm text-gray-400">
                  See all your bills and payments
                </p>
              </div>
            </Button>
          </Link>
          <Link href="/customer/profile">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <Clock className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Update Profile</p>
                <p className="text-sm text-gray-400">
                  Manage your account settings
                </p>
              </div>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
