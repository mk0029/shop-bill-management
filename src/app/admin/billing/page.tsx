"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/ui/dropdown";
import { BillForm } from "@/components/forms/bill-form";
import { useLocaleStore } from "@/store/locale-store";
import { useRouter } from "next/navigation";
import { shareBillOnWhatsApp, BillDetails } from "@/lib/whatsapp-utils";
import {
  FileText,
  Plus,
  Search,
  Calculator,
  User,
  MapPin,
  Calendar,
  Eye,
  Download,
  Edit,
  Trash2,
  Minus,
  ArrowRight,
  Share2,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string;
}

interface Item {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface BillItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Bill {
  id: string;
  customerName: string;
  customerId: string;
  date: string;
  items: BillItem[];
  serviceType: string;
  locationType: string;
  homeVisitFee: number;
  subtotal: number;
  total: number;
  status: string;
  notes?: string;
}

// Mock data
const mockCustomers: Customer[] = [
  {
    id: "1",
    name: "John Doe",
    phone: "+91 9876543210",
    location: "Mumbai, Maharashtra",
  },
  {
    id: "2",
    name: "Jane Smith",
    phone: "+91 9876543211",
    location: "Delhi, India",
  },
  {
    id: "3",
    name: "Mike Johnson",
    phone: "+91 9876543212",
    location: "Bangalore, Karnataka",
  },
];

const mockItems: Item[] = [
  { id: "1", name: "LED Bulb 10W", price: 200, category: "lighting" },
  { id: "2", name: "Ceiling Fan", price: 2500, category: "fan" },
  { id: "3", name: "Switch 2-way", price: 150, category: "switch" },
  { id: "4", name: "Wire 2.5mm", price: 50, category: "wiring" },
  { id: "5", name: "Socket 3-pin", price: 100, category: "socket" },
];

const mockBills: Bill[] = [
  {
    id: "1",
    customerName: "John Doe",
    customerId: "1",
    date: "2025-01-15",
    items: [
      { name: "LED Bulb 10W", quantity: 5, price: 200, total: 1000 },
      { name: "Switch 2-way", quantity: 2, price: 150, total: 300 },
    ],
    serviceType: "home",
    locationType: "home",
    homeVisitFee: 500,
    subtotal: 1300,
    total: 1800,
    status: "paid",
  },
  {
    id: "2",
    customerName: "Jane Smith",
    customerId: "2",
    date: "2025-01-14",
    items: [{ name: "Ceiling Fan", quantity: 1, price: 2500, total: 2500 }],
    serviceType: "sale",
    locationType: "shop",
    homeVisitFee: 0,
    subtotal: 2500,
    total: 2500,
    status: "pending",
  },
];

const serviceTypeOptions = [
  { value: "sale", label: "Sale" },
  { value: "repair", label: "Repair" },
  { value: "custom", label: "Custom" },
];

const locationTypeOptions = [
  { value: "shop", label: "Shop" },
  { value: "home", label: "Home" },
];

export default function BillingPage() {
  const { currency } = useLocaleStore();
  const router = useRouter();
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredBills = mockBills.filter(
    (bill) =>
      (bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.id.includes(searchTerm)) &&
      (filterStatus === "all" || bill.status === filterStatus)
  );

  const handleCreateBill = async (billData: {
    customerId: string;
    serviceType: string;
    locationType: string;
    items: BillItem[];
    notes: string;
  }) => {
    console.log("Creating bill:", billData);
    // TODO: Implement bill creation
    setShowCreateBill(false);
  };

  const handleViewCustomerBills = (customerId: string) => {
    router.push(`/admin/customers/${customerId}/bills`);
  };

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
  };

  const handleShareOnWhatsApp = (bill: Bill) => {
    const billDetails: BillDetails = {
      billNumber: bill.id,
      customerName: bill.customerName,
      customerPhone:
        mockCustomers.find((c) => c.id === bill.customerId)?.phone || "",
      billDate: bill.date,
      dueDate: bill.date, // Using bill date as due date for now
      items: bill.items,
      subtotal: bill.subtotal,
      total: bill.total,
      notes: bill.notes,
    };

    shareBillOnWhatsApp(billDetails);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Billing Management
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Create and manage customer bills and invoices
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin/billing/create")}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Bill
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="p-3 sm:p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-white">
                {mockBills.length}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                Total Bills
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg sm:text-2xl font-bold text-white">
                {currency}
                {mockBills
                  .reduce((sum, bill) => sum + bill.total, 0)
                  .toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                Total Revenue
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-white">
                {
                  mockBills.filter(
                    (b) => b.date === new Date().toISOString().split("T")[0]
                  ).length
                }
              </p>
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                Today&apos;s Bills
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-white">
                {mockBills.filter((b) => b.status === "pending").length}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 truncate">
                Pending Bills
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="p-4 bg-gray-900 border-gray-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search bills by customer name or bill ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <Dropdown
            options={[
              { value: "all", label: "All Bills" },
              { value: "paid", label: "Paid" },
              { value: "pending", label: "Pending" },
            ]}
            value={filterStatus}
            onValueChange={setFilterStatus}
            placeholder="Filter by status"
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Bills List */}
      <Card className="bg-gray-900 border-gray-800">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Recent Bills
          </h2>
          <div className="space-y-4">
            {filteredBills.map((bill, index) => (
              <motion.div
                key={bill.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        Bill #{bill.id}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {bill.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-white">
                      {currency}
                      {bill.total.toLocaleString()}
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
                </div>

                <div className="flex items-center justify-between">
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
                    <span className="text-xs px-2 py-1 rounded bg-gray-700">
                      {bill.items.length} items
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewBill(bill)}
                      className="hover:bg-gray-700"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewCustomerBills(bill.customerId)}
                      className="hover:bg-gray-700"
                    >
                      <User className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-gray-700"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>

      {/* Bill Form */}
      <BillForm
        isOpen={showCreateBill}
        onClose={() => setShowCreateBill(false)}
        onSubmit={handleCreateBill}
        customers={mockCustomers}
        items={mockItems}
      />

      {/* Bill Detail Modal */}
      <Modal
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={`Bill Details #${selectedBill?.id}`}
        size="lg"
      >
        {selectedBill && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Customer</p>
                <p className="text-white">{selectedBill.customerName}</p>
              </div>
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Date</p>
                <p className="text-white">{selectedBill.date}</p>
              </div>
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Service Type</p>
                <p className="text-white capitalize">
                  {selectedBill.serviceType}
                </p>
              </div>
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Location</p>
                <p className="text-white">
                  {selectedBill.locationType === "home"
                    ? "Home Service"
                    : "Shop Service"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-400 mb-3">Items</p>
              <div className="space-y-2">
                {selectedBill.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between p-3 bg-gray-800 rounded border border-gray-700"
                  >
                    <div>
                      <p className="text-white">{item.name}</p>
                      <p className="text-sm text-gray-400">
                        Qty: {item.quantity} × {currency}
                        {item.price}
                      </p>
                    </div>
                    <p className="text-white font-medium">
                      {currency}
                      {item.total.toLocaleString()}
                    </p>
                  </div>
                ))}
                {selectedBill.homeVisitFee > 0 && (
                  <div className="flex justify-between p-3 bg-gray-800 rounded border border-gray-700">
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
                  {selectedBill.total.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() => handleViewCustomerBills(selectedBill.customerId)}
              >
                <User className="w-4 h-4 mr-2" />
                View Customer Bills
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleShareOnWhatsApp(selectedBill)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share on WhatsApp
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download Bill
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
