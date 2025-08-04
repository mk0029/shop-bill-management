"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocaleStore } from "@/store/locale-store";
import { useAuthStore } from "@/store/auth-store";
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Plus,
  Eye,
  Calendar,
  Activity,
} from "lucide-react";
import Link from "next/link";

// Mock data - will be replaced with real data from Sanity
const mockStats = {
  totalCustomers: 156,
  totalBills: 1247,
  monthlyRevenue: 125000,
  monthlyGrowth: 12.5,
  recentBills: [
    {
      id: "1",
      customerName: "John Doe",
      amount: 2500,
      date: "2025-01-15",
      status: "paid",
    },
    {
      id: "2",
      customerName: "Jane Smith",
      amount: 1800,
      date: "2025-01-14",
      status: "pending",
    },
    {
      id: "3",
      customerName: "Mike Johnson",
      amount: 3200,
      date: "2025-01-13",
      status: "paid",
    },
    {
      id: "4",
      customerName: "Sarah Wilson",
      amount: 1500,
      date: "2025-01-12",
      status: "paid",
    },
  ],
  topCustomers: [
    { name: "John Doe", totalSpent: 15000, billCount: 8 },
    { name: "Jane Smith", totalSpent: 12500, billCount: 6 },
    { name: "Mike Johnson", totalSpent: 10800, billCount: 5 },
  ],
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down";
  trendValue?: string;
}) => (
  <Card className="p-6 bg-gray-900 border-gray-800">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {trend && trendValue && (
          <div
            className={`flex items-center mt-2 text-sm ${
              trend === "up" ? "text-green-400" : "text-red-400"
            }`}
          >
            <TrendingUp
              className={`w-4 h-4 mr-1 ${trend === "down" ? "rotate-180" : ""}`}
            />
            {trendValue}
          </div>
        )}
      </div>
      <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
    </div>
  </Card>
);

export default function AdminDashboard() {
  const { t, currency } = useLocaleStore();
  const { user, role, isAuthenticated } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <Card className="p-4 bg-yellow-900/20 border-yellow-800">
        <h3 className="text-yellow-400 font-bold mb-2">Debug Info:</h3>
        <div className="text-yellow-300 text-sm space-y-1">
          <p>User: {user?.name || "No user"}</p>
          <p>Role: {role || "No role"}</p>
          <p>Authenticated: {isAuthenticated ? "Yes" : "No"}</p>
          <p>User ID: {user?.clerkId || "No ID"}</p>
          <p>User Object: {JSON.stringify(user, null, 2)}</p>
        </div>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {t("nav.dashboard")}
          </h1>
          <p className="text-gray-400 mt-1">
            Overview of your electrician shop business
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/customers">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </Link>
          <Link href="/admin/billing/create">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Create Bill
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Customers"
          value={mockStats.totalCustomers}
          icon={Users}
        />
        <StatCard
          title="Total Bills"
          value={mockStats.totalBills}
          icon={FileText}
        />
        <StatCard
          title="Monthly Revenue"
          value={`${currency}${mockStats.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue={`+${mockStats.monthlyGrowth}%`}
        />
        <StatCard
          title="Growth Rate"
          value={`${mockStats.monthlyGrowth}%`}
          icon={TrendingUp}
          trend="up"
          trendValue="This month"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Bills</h2>
            <Link href="/admin/billing">
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {mockStats.recentBills.map((bill) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-white">{bill.customerName}</p>
                  <p className="text-sm text-gray-400">{bill.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">
                    {currency}
                    {bill.amount.toLocaleString()}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      bill.status === "paid"
                        ? "bg-green-900 text-green-300"
                        : "bg-yellow-900 text-yellow-300"
                    }`}
                  >
                    {bill.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Top Customers */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Top Customers</h2>
            <Link href="/admin/customers">
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View All
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {mockStats.topCustomers.map((customer, index) => (
              <motion.div
                key={customer.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {customer.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{customer.name}</p>
                    <p className="text-sm text-gray-400">
                      {customer.billCount} bills
                    </p>
                  </div>
                </div>
                <p className="font-semibold text-white">
                  {currency}
                  {customer.totalSpent.toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/customers">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <Users className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Manage Customers</p>
                <p className="text-sm text-gray-400">
                  Add, edit, or view customers
                </p>
              </div>
            </Button>
          </Link>
          <Link href="/admin/billing/create">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <FileText className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">Create Bill</p>
                <p className="text-sm text-gray-400">Generate new invoice</p>
              </div>
            </Button>
          </Link>
          <Link href="/admin/sales-report">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <Activity className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-medium">View Reports</p>
                <p className="text-sm text-gray-400">
                  Analyze business performance
                </p>
              </div>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
