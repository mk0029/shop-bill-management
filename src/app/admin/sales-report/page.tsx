"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocaleStore } from "@/store/locale-store";
import { useSalesAnalytics } from "@/hooks/use-sales-analytics";
import {
  formatCurrency,
  formatPercentage,
  formatTrendValue,
  getTrendDirection,
} from "@/lib/format-utils";
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
  Loader2,
} from "lucide-react";

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
        <p className="text-gray-400 text-xs sm:text-sm font-medium">{title}</p>
        <p className="text-xl md:text-2xl font-bold text-white sm:mt-1">
          {value}
        </p>
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

  const { analytics, isLoading } = useSalesAnalytics(dateRange);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-white">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading sales analytics...</span>
        </div>
      </div>
    );
  }

  // Show message if no data is available
  if (analytics.totalBills === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Sales Reports</h1>
            <p className="text-gray-400 mt-1">
              Analyze your business performance and track growth
            </p>
          </div>
        </div>

        <Card className="p-12 bg-gray-900 border-gray-800 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className=" h-6 w-6 sm:w-8 sm:h-8  text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            No Sales Data Available
          </h2>
          <p className="text-gray-400 mb-4">
            Start creating bills to see your sales analytics and reports here.
          </p>
          <Button onClick={() => (window.location.href = "/admin/billing")}>
            Create First Bill
          </Button>
        </Card>
      </div>
    );
  }

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
          <Button
            onClick={() => {
              const url = `/api/sales-report/export?dateRange=${dateRange}&format=csv`;
              window.open(url, "_blank");
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
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
          value={formatCurrency(analytics.totalRevenue, currency)}
          icon={DollarSign}
          trend={getTrendDirection(analytics.monthlyGrowth)}
          trendValue={formatTrendValue(analytics.monthlyGrowth)}
          color="green"
        />
        <StatCard
          title="Total Profit"
          value={formatCurrency(analytics.totalProfit, currency)}
          icon={TrendingUp}
          trend={getTrendDirection(
            analytics.performanceInsights.profitMargin - 30
          )}
          trendValue={`${formatPercentage(
            analytics.performanceInsights.profitMargin
          )} margin`}
          color="blue"
        />
        <StatCard
          title="Total Bills"
          value={analytics.totalBills}
          icon={FileText}
          trend="up"
          trendValue={`${analytics.totalBills} bills`}
          color="purple"
        />
        <StatCard
          title="Avg Bill Value"
          value={formatCurrency(analytics.averageBillValue, currency)}
          icon={BarChart3}
          trend={getTrendDirection(analytics.averageBillValue - 500)}
          trendValue="per bill"
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
            {analytics.monthlyData.length > 0 ? (
              analytics.monthlyData.map((data, index) => (
                <motion.div
                  key={data.month}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className=" h-6 w-6 sm:w-8 sm:h-8  bg-blue-600/20 rounded flex items-center justify-center">
                      <span className="text-blue-400 text-xs sm:text-sm font-medium">
                        {data.month}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {currency}
                        {data.revenue.toLocaleString()}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {data.bills} bills
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-medium">
                      {currency}
                      {Math.round(data.profit).toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-sm">profit</p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No monthly data available</p>
              </div>
            )}
          </div>
        </Card>

        {/* Service Type Breakdown */}
        <Card className="p-6 bg-gray-900 border-gray-800">
          <h2 className="text-xl font-semibold text-white mb-4">
            Service Type Breakdown
          </h2>
          <div className="space-y-4">
            {analytics.serviceTypeBreakdown.length > 0 ? (
              analytics.serviceTypeBreakdown.map((service, index) => (
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
                      {analytics.totalRevenue > 0
                        ? (
                            (service.revenue / analytics.totalRevenue) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No service data available</p>
              </div>
            )}
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
            {analytics.topCustomers.length > 0 ? (
              analytics.topCustomers.map((customer, index) => (
                <motion.div
                  key={customer.customerId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className=" h-6 w-6 sm:w-8 sm:h-8  bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-medium">
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
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No customer data available</p>
              </div>
            )}
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
            {analytics.topItems.length > 0 ? (
              analytics.topItems.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className=" h-6 w-6 sm:w-8 sm:h-8  bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-medium">
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
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No item data available</p>
              </div>
            )}
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
              <TrendingUp className=" h-6 w-6 sm:w-8 sm:h-8  text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Revenue Growth
            </h3>
            <p className="text-3xl font-bold text-green-400 mb-1">
              {analytics.performanceInsights.revenueGrowth >= 0 ? "+" : ""}
              {analytics.performanceInsights.revenueGrowth.toFixed(1)}%
            </p>
            <p className="text-gray-400 text-sm">Compared to last period</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Customer Retention
            </h3>
            <p className="text-3xl font-bold text-blue-400 mb-1">
              {analytics.performanceInsights.customerRetention.toFixed(0)}%
            </p>
            <p className="text-gray-400 text-sm">Repeat customers</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className=" h-6 w-6 sm:w-8 sm:h-8  text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Profit Margin
            </h3>
            <p className="text-3xl font-bold text-purple-400 mb-1">
              {analytics.performanceInsights.profitMargin.toFixed(0)}%
            </p>
            <p className="text-gray-400 text-sm">Average across all services</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
