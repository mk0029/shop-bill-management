"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocaleStore } from "@/store/locale-store";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  Calendar,
  Download,
  Filter,
  Eye,
} from "lucide-react";

// Mock data for sales analytics
const mockSalesData = {
  totalRevenue: 125000,
  totalProfit: 45000,
  totalBills: 156,
  averageBillValue: 801,
  monthlyGrowth: 12.5,
  topCustomers: [
    { name: "John Doe", totalSpent: 15000, billCount: 8 },
    { name: "Jane Smith", totalSpent: 12500, billCount: 6 },
    { name: "Mike Johnson", totalSpent: 10800, billCount: 5 },
    { name: "Sarah Wilson", totalSpent: 8500, billCount: 4 },
    { name: "David Brown", totalSpent: 7200, billCount: 3 },
  ],
  topItems: [
    { name: "LED Bulb 10W", soldCount: 45, revenue: 9000 },
    { name: "Ceiling Fan", soldCount: 12, revenue: 30000 },
    { name: "Switch 2-way", soldCount: 38, revenue: 5700 },
    { name: "Wire 2.5mm", soldCount: 120, revenue: 6000 },
    { name: "Socket 3-pin", soldCount: 25, revenue: 2500 },
  ],
  monthlyData: [
    { month: "Jan", revenue: 15000, profit: 5400, bills: 18 },
    { month: "Feb", revenue: 18000, profit: 6480, bills: 22 },
    { month: "Mar", revenue: 22000, profit: 7920, bills: 28 },
    { month: "Apr", revenue: 19000, profit: 6840, bills: 24 },
    { month: "May", revenue: 25000, profit: 9000, bills: 32 },
    { month: "Jun", revenue: 26000, profit: 9360, bills: 32 },
  ],
  serviceTypeBreakdown: [
    { type: "Sale", count: 85, revenue: 68000 },
    { type: "Repair", count: 45, revenue: 36000 },
    { type: "Custom", count: 26, revenue: 21000 },
  ],
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "blue",
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: "up" | "down";
  trendValue?: string;
  color?: string;
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
            {trend === "up" ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {trendValue}
          </div>
        )}
      </div>
      <div
        className={`w-12 h-12 bg-${color}-600/20 rounded-lg flex items-center justify-center`}
      >
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
    </div>
  </Card>
);

export default function SalesReportPage() {
  const { currency } = useLocaleStore();
  const [dateRange, setDateRange] = useState("month");
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Sales Reports</h1>
          <p className="text-gray-400 mt-1">
            Analyze your business performance and track growth
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4 bg-gray-900 border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={dateRange === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("week")}
            >
              This Week
            </Button>
            <Button
              variant={dateRange === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("month")}
            >
              This Month
            </Button>
            <Button
              variant={dateRange === "quarter" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("quarter")}
            >
              This Quarter
            </Button>
            <Button
              variant={dateRange === "year" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange("year")}
            >
              This Year
            </Button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Input type="date" className="w-auto" defaultValue="2025-01-01" />
            <span className="text-gray-400">to</span>
            <Input type="date" className="w-auto" defaultValue="2025-01-31" />
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`${currency}${mockSalesData.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue={`+${mockSalesData.monthlyGrowth}%`}
          color="green"
        />
        <StatCard
          title="Total Profit"
          value={`${currency}${mockSalesData.totalProfit.toLocaleString()}`}
          icon={TrendingUp}
          trend="up"
          trendValue="+8.2%"
          color="blue"
        />
        <StatCard
          title="Total Bills"
          value={mockSalesData.totalBills}
          icon={FileText}
          trend="up"
          trendValue="+15 this month"
          color="purple"
        />
        <StatCard
          title="Avg Bill Value"
          value={`${currency}${mockSalesData.averageBillValue}`}
          icon={BarChart3}
          trend="down"
          trendValue="-2.1%"
          color="yellow"
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-4">
            Monthly Revenue Trend
          </h2>
          <div className="space-y-4">
            {mockSalesData.monthlyData.map((data, index) => (
              <motion.div
                key={data.month}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600/20 rounded flex items-center justify-center">
                    <span className="text-blue-400 text-sm font-medium">
                      {data.month}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {currency}
                      {data.revenue.toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">{data.bills} bills</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-medium">
                    {currency}
                    {data.profit.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">profit</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Service Type Breakdown */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-4">
            Service Type Breakdown
          </h2>
          <div className="space-y-4">
            {mockSalesData.serviceTypeBreakdown.map((service, index) => (
              <motion.div
                key={service.type}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{service.type}</p>
                  <p className="text-gray-400 text-sm">
                    {service.count} services
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">
                    {currency}
                    {service.revenue.toLocaleString()}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {(
                      (service.revenue / mockSalesData.totalRevenue) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Top Customers</h2>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {mockSalesData.topCustomers.map((customer, index) => (
              <motion.div
                key={customer.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{customer.name}</p>
                    <p className="text-gray-400 text-sm">
                      {customer.billCount} bills
                    </p>
                  </div>
                </div>
                <p className="text-white font-bold">
                  {currency}
                  {customer.totalSpent.toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Top Items */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Top Selling Items
            </h2>
            <Button variant="ghost" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {mockSalesData.topItems.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{item.name}</p>
                    <p className="text-gray-400 text-sm">
                      {item.soldCount} sold
                    </p>
                  </div>
                </div>
                <p className="text-white font-bold">
                  {currency}
                  {item.revenue.toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card className="p-6 bg-gray-900 border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-4">
          Performance Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Revenue Growth
            </h3>
            <p className="text-3xl font-bold text-green-400 mb-1">+12.5%</p>
            <p className="text-gray-400 text-sm">Compared to last month</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Customer Retention
            </h3>
            <p className="text-3xl font-bold text-blue-400 mb-1">87%</p>
            <p className="text-gray-400 text-sm">Repeat customers</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Profit Margin
            </h3>
            <p className="text-3xl font-bold text-purple-400 mb-1">36%</p>
            <p className="text-gray-400 text-sm">Average across all services</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
