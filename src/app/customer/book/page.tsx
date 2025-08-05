"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocaleStore } from "@/store/locale-store";
import { useBills } from "@/hooks/use-sanity-api";
import { useUser } from "@clerk/nextjs";
import {
  FileText,
  Search,
  Calendar,
  MapPin,
  Eye,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Sanity API interfaces based on api-docs.md
interface BillItem {
  _id: string;
  product: {
    _id: string;
    name: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  taxAmount: number;
  description?: string;
  warranty?: string;
  status: string;
}

interface Bill {
  _id: string;
  billId: string;
  billNumber: string;
  customer: {
    _id: string;
    name: string;
    customerId: string;
  };
  customerAddress: {
    _id: string;
    addressLine1: string;
    city: string;
    type: string;
  };
  serviceType: "repair" | "sale" | "installation" | "maintenance" | "custom";
  locationType: "shop" | "home" | "office";
  serviceDate: string;
  completionDate?: string;
  homeVisitFee: number;
  transportationFee: number;
  laborCharges: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentStatus: "pending" | "partial" | "paid" | "overdue";
  status: "draft" | "confirmed" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  items?: BillItem[];
}

export default function CustomerBillingBook() {
  const { currency } = useLocaleStore();
  const { user } = useUser();
  const { getCustomerBills } = useBills();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filterType, setFilterType] = useState<
    "all" | "home" | "shop" | "office"
  >("all");

  // Fetch customer bills on component mount
  useEffect(() => {
    if (user?.id) {
      getCustomerBills.execute(user.id);
    }
  }, [getCustomerBills, user.id]);

  const bills = getCustomerBills.data || [];

  const filteredBills = bills.filter((bill: Bill) => {
    const matchesSearch =
      searchTerm === "" ||
      bill.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.items &&
        bill.items.some(
          (item: BillItem) =>
            item.product.name
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            (item.description &&
              item.description.toLowerCase().includes(searchTerm.toLowerCase()))
        ));

    const matchesFilter =
      filterType === "all" || bill.locationType === filterType;
    return matchesSearch && matchesFilter;
  });

  const totalSpent = bills.reduce(
    (sum: number, bill: Bill) => sum + bill.totalAmount,
    0
  );

  // Loading state
  if (getCustomerBills.loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading your billing history...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (getCustomerBills.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-8 bg-gray-900 border-gray-800 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Failed to Load Bills
          </h3>
          <p className="text-gray-400 mb-4">{getCustomerBills.error}</p>
          <Button
            onClick={() => user?.id && getCustomerBills.execute(user.id)}
            className="w-full">
            Try Again
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
          <h1 className="text-3xl font-bold text-white">My Billing Book</h1>
          <p className="text-gray-400 mt-1">
            Complete history of your electrical services and payments
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Total Spent</p>
          <p className="text-2xl font-bold text-white">
            {currency}
            {totalSpent.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="p-4 bg-gray-900 border-gray-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search bills by items or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}>
              All
            </Button>
            <Button
              variant={filterType === "home" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("home")}>
              Home Service
            </Button>
            <Button
              variant={filterType === "shop" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("shop")}>
              Shop Service
            </Button>
            <Button
              variant={filterType === "office" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("office")}>
              Office Service
            </Button>
          </div>
        </div>
      </Card>

      {/* Bills List */}
      <div className="space-y-4">
        {filteredBills.map((bill: Bill, index: number) => (
          <motion.div
            key={bill._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}>
            <Card className="p-6 bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      Bill #{bill.billNumber}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(bill.serviceDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {bill.locationType === "home"
                          ? "Home Service"
                          : bill.locationType === "shop"
                          ? "Shop Service"
                          : "Office Service"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    {currency}
                    {bill.totalAmount.toLocaleString()}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      bill.paymentStatus === "paid"
                        ? "bg-green-900 text-green-300"
                        : bill.paymentStatus === "partial"
                        ? "bg-yellow-900 text-yellow-300"
                        : bill.paymentStatus === "overdue"
                        ? "bg-red-900 text-red-300"
                        : "bg-gray-900 text-gray-300"
                    }`}>
                    {bill.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">
                    Items & Services
                  </p>
                  <div className="space-y-1">
                    {bill.items && bill.items.length > 0 ? (
                      bill.items.map((item: BillItem, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-400">
                            {item.product.name} × {item.quantity}
                          </span>
                          <span className="text-white">
                            {currency}
                            {item.unitPrice.toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-400">
                        Service: {bill.serviceType}
                      </div>
                    )}
                    {bill.homeVisitFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Home Visit Fee</span>
                        <span className="text-white">
                          {currency}
                          {bill.homeVisitFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {bill.laborCharges > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Labor Charges</span>
                        <span className="text-white">
                          {currency}
                          {bill.laborCharges.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">
                    Service Details
                  </p>
                  <div className="space-y-1 text-sm text-gray-400">
                    <p>Type: {bill.serviceType}</p>
                    <p>Status: {bill.status}</p>
                    <p>Priority: {bill.priority}</p>
                    {bill.completionDate && (
                      <p>
                        Completed:{" "}
                        {new Date(bill.completionDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      bill.serviceType === "installation"
                        ? "bg-blue-900 text-blue-300"
                        : bill.serviceType === "repair"
                        ? "bg-yellow-900 text-yellow-300"
                        : bill.serviceType === "custom"
                        ? "bg-purple-900 text-purple-300"
                        : bill.serviceType === "maintenance"
                        ? "bg-orange-900 text-orange-300"
                        : "bg-green-900 text-green-300"
                    }`}>
                    {bill.serviceType}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBill(bill)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredBills.length === 0 && (
        <Card className="p-12 bg-gray-900 border-gray-800 text-center">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No bills found
          </h3>
          <p className="text-gray-400">
            {searchTerm || filterType !== "all"
              ? "Try adjusting your search or filter criteria"
              : "You don't have any bills yet"}
          </p>
        </Card>
      )}

      {/* Bill Detail Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  Bill Details #{selectedBill.billNumber}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBill(null)}>
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Service Date</p>
                    <p className="text-white">
                      {new Date(selectedBill.serviceDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Service Type</p>
                    <p className="text-white capitalize">
                      {selectedBill.serviceType}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Location</p>
                    <p className="text-white">
                      {selectedBill.locationType === "home"
                        ? "Home Service"
                        : selectedBill.locationType === "shop"
                        ? "Shop Service"
                        : "Office Service"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Payment Status</p>
                    <p className="text-white capitalize">
                      {selectedBill.paymentStatus}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Work Status</p>
                    <p className="text-white capitalize">
                      {selectedBill.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Priority</p>
                    <p className="text-white capitalize">
                      {selectedBill.priority}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-3">Items & Services</p>
                  <div className="space-y-2">
                    {selectedBill.items && selectedBill.items.length > 0 ? (
                      selectedBill.items.map((item: BillItem, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between p-3 bg-gray-800 rounded">
                          <div>
                            <p className="text-white">{item.product.name}</p>
                            <p className="text-sm text-gray-400">
                              Quantity: {item.quantity} | Unit Price: {currency}
                              {item.unitPrice.toLocaleString()}
                            </p>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {item.description}
                              </p>
                            )}
                            {item.warranty && (
                              <p className="text-xs text-blue-400 mt-1">
                                Warranty: {item.warranty}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">
                              {currency}
                              {item.totalPrice.toLocaleString()}
                            </p>
                            {item.discount > 0 && (
                              <p className="text-xs text-green-400">
                                Discount: -{currency}
                                {item.discount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-gray-800 rounded">
                        <p className="text-white">
                          Service: {selectedBill.serviceType}
                        </p>
                      </div>
                    )}

                    {/* Additional charges */}
                    {selectedBill.homeVisitFee > 0 && (
                      <div className="flex justify-between p-3 bg-gray-800 rounded">
                        <p className="text-white">Home Visit Fee</p>
                        <p className="text-white font-medium">
                          {currency}
                          {selectedBill.homeVisitFee.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedBill.transportationFee > 0 && (
                      <div className="flex justify-between p-3 bg-gray-800 rounded">
                        <p className="text-white">Transportation Fee</p>
                        <p className="text-white font-medium">
                          {currency}
                          {selectedBill.transportationFee.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedBill.laborCharges > 0 && (
                      <div className="flex justify-between p-3 bg-gray-800 rounded">
                        <p className="text-white">Labor Charges</p>
                        <p className="text-white font-medium">
                          {currency}
                          {selectedBill.laborCharges.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white">
                      {currency}
                      {selectedBill.subtotal.toLocaleString()}
                    </span>
                  </div>
                  {selectedBill.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Discount</span>
                      <span className="text-green-400">
                        -{currency}
                        {selectedBill.discountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax</span>
                    <span className="text-white">
                      {currency}
                      {selectedBill.taxAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-white border-t border-gray-700 pt-2">
                    <span>Total Amount</span>
                    <span>
                      {currency}
                      {selectedBill.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Service Address</p>
                  <p className="text-white">
                    {selectedBill.customerAddress.addressLine1},{" "}
                    {selectedBill.customerAddress.city}
                  </p>
                  <p className="text-sm text-gray-400">
                    Address Type: {selectedBill.customerAddress.type}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
