/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocaleStore } from "@/store/locale-store";
import { useSalesAnalytics } from "@/hooks/use-sales-analytics";
import { useBills } from "@/hooks/use-sanity-data";
import { Dropdown } from "@/components/ui/dropdown";
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
import ResponsiveAccordion from "@/components/ui/responsive-accordion";

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
  <Card className="p-3 sm:p-4 lg:p-6 bg-gray-900 border-gray-800">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-xs sm:text-sm font-medium">{title}</p>
        <p className="text-lg sm:text-xl md:text-2xl leading-[120%] font-bold text-white sm:mt-1">
          {value}
        </p>
        {trend && trendValue && (
          <div
            className={`flex items-center sm:mt-1 md:mt-2 text-sm ${
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
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);
  const [paymentStatuses, setPaymentStatuses] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [mode, setMode] = useState<"received" | "billed">("received");
  const { bills } = useBills();

  const availableServiceTypes = useMemo(() => {
    const set = new Set<string>();
    bills.forEach((b: any) => {
      const s = (b.serviceType || b.locationType)?.toString()?.trim();
      if (s) set.add(s);
    });
    return Array.from(set);
  }, [bills]);

  const { analytics, isLoading } = useSalesAnalytics(dateRange, {
    from,
    to,
    paymentStatuses,
    serviceTypes,
    mode,
  });

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
  // We no longer early-return when there's no data. Filters remain visible; content below shows an empty state.

  return (
    <div className="space-y-2 md:space-y-6 px-1.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Sales Reports
          </h1>
         
        </div>
        <div className="flex gap-3">
         
          <Button
            onClick={() => {
              const params = new URLSearchParams();
              params.set("dateRange", dateRange);
              params.set("format", "csv");
              if (dateRange === "custom") {
                if (from) params.set("from", from);
                if (to) params.set("to", to);
              }
              if (paymentStatuses.length > 0)
                params.set("paymentStatuses", paymentStatuses.join(","));
              if (serviceTypes.length > 0)
                params.set("serviceTypes", serviceTypes.join(","));
              params.set("mode", mode);
              const url = `/api/sales-report/export?${params.toString()}`;
              window.open(url, "_blank");
            }}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters: Date Range + Payment Status + Service Types */}
      <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-300" />
            <h3 className="text-base md:text-lg font-semibold text-white">Filters & Search</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <span className="text-gray-400 text-sm mr-1">Mode</span>
              <Button
                size="sm"
                variant={mode === "received" ? "default" : "outline"}
                onClick={() => setMode("received")}
              >
                Received
              </Button>
              <Button
                size="sm"
                variant={mode === "billed" ? "default" : "outline"}
                onClick={() => setMode("billed")}
              >
                Billed
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateRange("month");
                setFrom(undefined);
                setTo(undefined);
                setPaymentStatuses([]);
                setServiceTypes([]);
              }}
            >
              Reset All
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-sm">Date Range</label>
            <Dropdown
              options={[
                { value: "week", label: "This Week" },
                { value: "month", label: "This Month" },
                { value: "quarter", label: "This Quarter" },
                { value: "year", label: "This Year" },
                { value: "custom", label: "Custom" },
              ]}
              value={dateRange}
              onValueChange={(v) => setDateRange(v)}
              placeholder="Select range"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-sm">From</label>
            <Input
              type="date"
              className="w-full"
              value={from ?? ""}
              onChange={(e) => setFrom(e.target.value || undefined)}
              disabled={dateRange !== "custom"}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-sm">To</label>
            <Input
              type="date"
              className="w-full"
              value={to ?? ""}
              onChange={(e) => setTo(e.target.value || undefined)}
              disabled={dateRange !== "custom"}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-sm">Payment Status</label>
            <Dropdown
              options={[
                { value: "", label: "All" },
                { value: "paid", label: "Paid" },
                { value: "partial", label: "Partial" },
                { value: "pending", label: "Pending" },
                { value: "overdue", label: "Overdue" },
              ]}
              value={paymentStatuses[0] ?? ""}
              onValueChange={(v) => setPaymentStatuses(v ? [v] : [])}
              placeholder="All"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 text-sm">Service Types</label>
            <Dropdown
              options={[{ value: "", label: "All" }, ...availableServiceTypes.map((t) => ({ value: t, label: t }))]}
              value={serviceTypes[0] ?? ""}
              onValueChange={(v) => setServiceTypes(v ? [v] : [])}
              placeholder="All"
            />
          </div>
        </div>
      </Card>

      {/* Content */}
      {analytics.totalBills === 0 ? (
        <Card className="p-12 bg-gray-900 border-gray-800 text-center mt-3">
          <div className="md:w-16 md:h-16 sm:h-14 sm:w-14 h-12 w-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className=" h-6 w-6 sm:w-8 sm:h-8  text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-1 md:mb-2">
            No Sales Data Available
          </h2>
          <p className="text-gray-400 mb-4">
            Adjust filters or start creating bills to see analytics here.
          </p>
          <Button onClick={() => (window.location.href = "/admin/billing")}>Create Bill</Button>
        </Card>
      ) : (
        <>
      {/* Key Metrics */}
      
   <ResponsiveAccordion title='Revanue Stats'>  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">   <StatCard
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
        /> </div></ResponsiveAccordion>
     

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-6">
        {/* Monthly Revenue Chart */}
       
        
          <ResponsiveAccordion title={  <h2 className="text-base md:text-xl text-white">
            Monthly Revenue Trend
          </h2>}>
          <div className="space-y-4 md:mt-4 mt-3">
            {analytics.monthlyData.length > 0 ? (
              analytics.monthlyData.map((data, index) => (
                <motion.div
                  key={data.month}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between">
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
          </div></ResponsiveAccordion>
          <ResponsiveAccordion title={  <h2 className="text-base md:text-xl text-white">
            Service Type Breakdown          </h2>}>
          <div className="space-y-4 md:mt-4 mt-3">
            {analytics.serviceTypeBreakdown.length > 0 ? (
              analytics.serviceTypeBreakdown.map((service, index) => (
                <motion.div
                  key={service.type}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
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
          </div></ResponsiveAccordion>
          <ResponsiveAccordion title={   <div className="flex items-center justify-between">
            <h2 className="text-base md:text-xl text-white">Top Customers</h2>
            <Button variant="ghost" size="sm" className="!py-1">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>}>
            <div className="space-y-4 md:mt-4 mt-3">
            {analytics.topCustomers.length > 0 ? (
              analytics.topCustomers.map((customer, index) => (
                <motion.div
                  key={customer.customerId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
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
                  <div className="text-right">
                    <p className="text-white font-bold">
                      {currency}
                      {customer.totalSpent.toLocaleString()}
                    </p>
                    {(customer as any).pending > 0 && (
                      <p className="text-xs text-yellow-300">pending: {currency}{(customer as any).pending.toLocaleString()}</p>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No customer data available</p>
              </div>
            )}
          </div></ResponsiveAccordion>
          <ResponsiveAccordion title={   <div className="flex items-center justify-between">
            <h2 className="text-base md:text-xl text-white">   Top Selling Items</h2>
            <Button variant="ghost" size="sm" className="!py-1">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>}>
          <div className="space-y-3">
            {analytics.topItems.length > 0 ? (
              analytics.topItems.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
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
          </div></ResponsiveAccordion>
       
    
       
      </div>

      {/* Detailed Analytics */}
      <Card className="p-3 sm:p-4 lg:p-6 bg-gray-900 border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-4">
          Performance Insights
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6">
          <div className="text-center">
            <div className="md:w-16 md:h-16 sm:h-14 sm:w-14 h-12 w-12 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className=" h-6 w-6 sm:w-8 sm:h-8  text-green-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">
              Revenue Growth
            </h3>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400 mb-1">
              {analytics.performanceInsights.revenueGrowth >= 0 ? "+" : ""}
              {analytics.performanceInsights.revenueGrowth.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <div className="md:w-16 md:h-16 sm:h-14 sm:w-14 h-12 w-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">
              Customer Retention
            </h3>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-400 mb-1">
              {analytics.performanceInsights.customerRetention.toFixed(0)}%
            </p>
          </div>
          <div className="text-center">
            <div className="md:w-16 md:h-16 sm:h-14 sm:w-14 h-12 w-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className=" h-6 w-6 sm:w-8 sm:h-8  text-purple-400" />
            </div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2">
              Profit Margin
            </h3>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-400 mb-1">
              {analytics.performanceInsights.profitMargin.toFixed(0)}%
            </p>
          </div>
        </div>
      </Card>
        </>
      )}
    </div>
  );
}
