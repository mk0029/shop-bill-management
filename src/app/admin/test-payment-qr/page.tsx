"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBills } from "@/hooks/use-sanity-data";
import { useLocaleStore } from "@/store/locale-store";
import { UpiPaymentModal } from "@/components/ui/upi-payment-modal";
import { AdminVerificationPanel } from "@/components/ui/payment-verification/admin-verification-panel";
import { generateBillReference } from "@/lib/upi-utils";
import { motion } from "framer-motion";
import {
  Search,
  QrCode,
  User,
  MapPin,
  FileText,
  Smartphone,
  CheckCircle2,
  Clock,
} from "lucide-react";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-green-900/50 text-green-300 border border-green-700/30";
    case "pending":
      return "bg-yellow-900/50 text-yellow-300 border border-yellow-700/30";
    case "overdue":
      return "bg-red-900/50 text-red-300 border border-red-700/30";
    default:
      return "bg-gray-800 text-gray-300 border border-gray-700/30";
  }
};

export default function TestPaymentQrPage() {
  const { bills } = useBills();
  const { currency } = useLocaleStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenQr = (bill: any) => {
    setSelectedBill({
      _id: bill._id,
      billNumber: bill.billNumber,
      totalAmount: bill.amount,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedBill(null);
  };

  const handleCloseModalOnly = () => {
    setModalOpen(false);
    setSelectedBill(null);
  };

  const transformedBills = useMemo(
    () =>
      bills.map((bill: any) => ({
        _id: bill._id,
        id: bill._id,
        billNumber: bill.billNumber,
        billReference: generateBillReference(bill.billNumber || "", bill._id),
        customerName: bill.customer?.name || "Unknown",
        customerPhone: bill.customer?.phone || "N/A",
        amount: bill.totalAmount || 0,
        date: bill.serviceDate
          ? new Date(bill.serviceDate).toISOString().split("T")[0]
          : "",
        status: (bill.paymentStatus === "paid"
          ? "paid"
          : bill.paymentStatus === "pending"
            ? "pending"
            : "overdue") as "paid" | "pending" | "overdue",
        locationType: bill.locationType,
      })),
    [bills]
  );

  const filteredBills = useMemo(
    () =>
      transformedBills.filter((bill) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          bill.customerName.toLowerCase().includes(q) ||
          bill.customerPhone.includes(q) ||
          bill.billNumber.toLowerCase().includes(q) ||
          bill.billReference.toLowerCase().includes(q);
        const matchesStatus =
          statusFilter === "all" || bill.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [transformedBills, searchTerm, statusFilter]
  );

  const stats = useMemo(
    () => ({
      total: transformedBills.length,
      paid: transformedBills.filter((b) => b.status === "paid").length,
      pending: transformedBills.filter((b) => b.status === "pending").length,
      overdue: transformedBills.filter((b) => b.status === "overdue").length,
      revenue: transformedBills
        .filter((b) => b.status === "paid")
        .reduce((s, b) => s + b.amount, 0),
    }),
    [transformedBills]
  );

  return (
    <div className="space-y-6 max-md:space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
          Dynamic UPI Payment System
        </h1>
        <p className="text-gray-400 mt-1">
          Generate dynamic QR codes with unique Bill References and verify
          payments manually
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Bills", value: stats.total, color: "text-white", bg: "bg-blue-600/20", icon: FileText },
          { label: "Paid", value: stats.paid, color: "text-green-400", bg: "bg-green-600/20", icon: CheckCircle2 },
          { label: "Pending", value: stats.pending, color: "text-yellow-400", bg: "bg-yellow-600/20", icon: Clock },
          { label: "Overdue", value: stats.overdue, color: "text-red-400", bg: "bg-red-600/20", icon: Clock },
          { label: "Revenue", value: `${currency}${stats.revenue.toLocaleString()}`, color: "text-emerald-400", bg: "bg-emerald-600/20", icon: Smartphone },
        ].map((stat) => (
          <Card key={stat.label} className="bg-gray-900/60 border-gray-800/60 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-xs font-medium">{stat.label}</p>
                  <p className={`text-lg sm:text-xl font-bold ${stat.color} mt-0.5`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminVerificationPanel />

      <Card className="bg-gray-900/60 border-gray-800/60 backdrop-blur-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
              <Input
                type="text"
                placeholder="Search by name, phone, bill number, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800/80 border-gray-700/80 text-white placeholder-gray-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === opt.value
                      ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                      : "bg-gray-800/80 text-gray-400 border border-gray-700/50 hover:bg-gray-700/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900/60 border-gray-800/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <span>All Bills</span>
            <span className="text-xs text-gray-500 font-normal">
              ({filteredBills.length} bills)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredBills.map((bill, idx) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="group flex items-center justify-between p-3 sm:p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/80 transition-all border border-transparent hover:border-gray-700/50"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-white text-sm truncate">
                        {bill.customerName}
                      </h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(bill.status)} shrink-0`}
                      >
                        {bill.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Bill #{bill.billNumber} &middot; {bill.customerPhone}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-600 mt-0.5 flex-wrap">
                      {bill.date && <span>{bill.date}</span>}
                      {bill.locationType && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {bill.locationType.replace(/_/g, " ")}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 font-mono">
                        <FileText className="w-2.5 h-2.5" />
                        {bill.billReference}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-right hidden sm:block">
                    <p className="font-semibold text-white text-sm">
                      {currency}
                      {bill.amount.toLocaleString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleOpenQr(bill)}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs px-3 py-1.5 h-auto rounded-lg transition-all shadow-lg shadow-purple-600/20"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1.5" />
                    Generate QR
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredBills.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">
                No bills found matching your criteria.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <UpiPaymentModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        bill={
          selectedBill || { billNumber: "", totalAmount: 0 }
        }
      />
    </div>
  );
}
