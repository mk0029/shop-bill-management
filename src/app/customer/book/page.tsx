"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocaleStore } from "@/store/locale-store";
import {
  FileText,
  Search,
  Filter,
  Calendar,
  MapPin,
  Eye,
  Download,
} from "lucide-react";

// Mock data - will be replaced with real data from Sanity
const mockBills = [
  {
    id: "1",
    date: "2025-01-15",
    amount: 2500,
    items: [
      { name: "LED Bulbs (10W)", quantity: 5, price: 200 },
      { name: "Switch Installation", quantity: 2, price: 750 },
    ],
    serviceType: "home",
    locationType: "home",
    homeVisitFee: 500,
    subtotal: 2000,
    status: "paid",
    notes: "Replaced old bulbs with LED, installed new switches in bedroom",
  },
  {
    id: "2",
    date: "2025-01-10",
    amount: 1800,
    items: [
      { name: "Fan Repair", quantity: 1, price: 1200 },
      { name: "Wiring Check", quantity: 1, price: 600 },
    ],
    serviceType: "repair",
    locationType: "shop",
    homeVisitFee: 0,
    subtotal: 1800,
    status: "paid",
    notes: "Ceiling fan motor repair and complete wiring inspection",
  },
  {
    id: "3",
    date: "2025-01-05",
    amount: 3200,
    items: [
      { name: "Complete Rewiring", quantity: 1, price: 2800 },
      { name: "Circuit Breaker", quantity: 1, price: 400 },
    ],
    serviceType: "custom",
    locationType: "home",
    homeVisitFee: 0,
    subtotal: 3200,
    status: "paid",
    notes: "Complete house rewiring with new circuit breaker installation",
  },
  {
    id: "4",
    date: "2024-12-28",
    amount: 1500,
    items: [
      { name: "Socket Installation", quantity: 4, price: 300 },
      { name: "Wire Extension", quantity: 1, price: 300 },
    ],
    serviceType: "sale",
    locationType: "home",
    homeVisitFee: 300,
    subtotal: 1200,
    status: "paid",
    notes: "Added new power sockets in kitchen and living room",
  },
];

export default function CustomerBillingBook() {
  const { currency } = useLocaleStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [filterType, setFilterType] = useState<"all" | "home" | "shop">("all");

  const filteredBills = mockBills.filter((bill) => {
    const matchesSearch =
      bill.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.items.some((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesFilter =
      filterType === "all" || bill.locationType === filterType;
    return matchesSearch && matchesFilter;
  });

  const totalSpent = mockBills.reduce((sum, bill) => sum + bill.amount, 0);

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
              onClick={() => setFilterType("all")}
            >
              All
            </Button>
            <Button
              variant={filterType === "home" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("home")}
            >
              Home Service
            </Button>
            <Button
              variant={filterType === "shop" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("shop")}
            >
              Shop Service
            </Button>
          </div>
        </div>
      </Card>

      {/* Bills List */}
      <div className="space-y-4">
        {filteredBills.map((bill, index) => (
          <motion.div
            key={bill.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Bill #{bill.id}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {bill.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {bill.locationType === "home"
                          ? "Home Service"
                          : "Shop Service"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    {currency}
                    {bill.amount.toLocaleString()}
                  </p>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-900 text-green-300">
                    {bill.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">
                    Items & Services
                  </p>
                  <div className="space-y-1">
                    {bill.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-400">
                          {item.name} × {item.quantity}
                        </span>
                        <span className="text-white">
                          {currency}
                          {item.price.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {bill.homeVisitFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Home Visit Fee</span>
                        <span className="text-white">
                          {currency}
                          {bill.homeVisitFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">
                    Service Notes
                  </p>
                  <p className="text-sm text-gray-400">{bill.notes}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      bill.serviceType === "home"
                        ? "bg-blue-900 text-blue-300"
                        : bill.serviceType === "repair"
                        ? "bg-yellow-900 text-yellow-300"
                        : bill.serviceType === "custom"
                        ? "bg-purple-900 text-purple-300"
                        : "bg-green-900 text-green-300"
                    }`}
                  >
                    {bill.serviceType}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedBill(bill)}
                  >
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
            className="bg-gray-900 rounded-lg border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">
                  Bill Details #{selectedBill.id}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBill(null)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p className="text-white">{selectedBill.date}</p>
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
                        : "Shop Service"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <p className="text-white capitalize">
                      {selectedBill.status}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-3">Items & Services</p>
                  <div className="space-y-2">
                    {selectedBill.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between p-3 bg-gray-800 rounded"
                      >
                        <div>
                          <p className="text-white">{item.name}</p>
                          <p className="text-sm text-gray-400">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                        <p className="text-white font-medium">
                          {currency}
                          {item.price.toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {selectedBill.homeVisitFee > 0 && (
                      <div className="flex justify-between p-3 bg-gray-800 rounded">
                        <p className="text-white">Home Visit Fee</p>
                        <p className="text-white font-medium">
                          {currency}
                          {selectedBill.homeVisitFee.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-4">
                  <div className="flex justify-between text-lg font-bold text-white">
                    <span>Total Amount</span>
                    <span>
                      {currency}
                      {selectedBill.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Service Notes</p>
                  <p className="text-white">{selectedBill.notes}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
