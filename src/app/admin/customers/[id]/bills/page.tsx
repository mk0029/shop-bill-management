"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useLocaleStore } from "@/store/locale-store";
import { shareBillOnWhatsApp, BillDetails } from "@/lib/whatsapp-utils";
import {
  FileText,
  Search,
  ArrowLeft,
  Eye,
  Download,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  User,
  Calculator,
  Plus,
  Share2,
} from "lucide-react";

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

interface Customer {
  id: string;
  name: string;
  phone: string;
  location: string;
}

// Mock data - in real app, this would come from API
const mockCustomers: Customer[] = [
  { id: "1", name: "John Doe", phone: "+91 9876543210", location: "Mumbai, Maharashtra" },
  { id: "2", name: "Jane Smith", phone: "+91 9876543211", location: "Delhi, India" },
  { id: "3", name: "Mike Johnson", phone: "+91 9876543212", location: "Bangalore, Karnataka" },
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
    customerName: "John Doe",
    customerId: "1",
    date: "2025-01-10",
    items: [
      { name: "Ceiling Fan", quantity: 1, price: 2500, total: 2500 },
    ],
    serviceType: "sale",
    locationType: "shop",
    homeVisitFee: 0,
    subtotal: 2500,
    total: 2500,
    status: "paid",
  },
  {
    id: "3",
    customerName: "John Doe",
    customerId: "1",
    date: "2025-01-05",
    items: [
      { name: "Wire 2.5mm", quantity: 10, price: 50, total: 500 },
      { name: "Socket 3-pin", quantity: 3, price: 100, total: 300 },
    ],
    serviceType: "repair",
    locationType: "home",
    homeVisitFee: 500,
    subtotal: 800,
    total: 1300,
    status: "pending",
  },
];

export default function CustomerBillsPage() {
  const params = useParams();
  const router = useRouter();
  const { currency } = useLocaleStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const customerId = params.id as string;
  const customer = mockCustomers.find(c => c.id === customerId);
  const customerBills = mockBills.filter(bill => bill.customerId === customerId);

  const filteredBills = customerBills.filter(
    (bill) =>
      (bill.id.includes(searchTerm) || bill.serviceType.includes(searchTerm)) &&
      (filterStatus === "all" || bill.status === filterStatus)
  );

  const handleShareOnWhatsApp = (bill: Bill) => {
    const billDetails: BillDetails = {
      billNumber: bill.id,
      customerName: bill.customerName,
      customerPhone: customer?.phone || "",
      billDate: bill.date,
      dueDate: bill.date, // Using bill date as due date for now
      items: bill.items,
      subtotal: bill.subtotal,
      total: bill.total,
      notes: bill.notes
    };
    
    shareBillOnWhatsApp(billDetails);
  };

  const totalRevenue = customerBills.reduce((sum, bill) => sum + bill.total, 0);
  const paidBills = customerBills.filter(bill => bill.status === "paid");
  const pendingBills = customerBills.filter(bill => bill.status === "pending");

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Customer Not Found</h1>
          <Button onClick={() => router.push("/admin/customers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/customers")}
            className="hover:bg-gray-800 p-2 sm:p-2"
          >
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
              {customer.name}&apos;s Bills
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base truncate">
              Bill history and management for {customer.name}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => router.push("/admin/billing/create")}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Bill
        </Button>
      </div>

      {/* Customer Info */}
      <Card className="p-4 sm:p-6 bg-gray-900 border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg sm:text-xl">
                {customer.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">{customer.name}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-gray-400 mt-1">
                <div className="flex items-center gap-1 text-sm">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{customer.phone}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{customer.location}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xl sm:text-2xl font-bold text-white">
              {currency}{totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs sm:text-sm text-gray-400">Total Revenue</p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-3 sm:p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-white">
                {customerBills.length}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Total Bills</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-white">
                {paidBills.length}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Paid Bills</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold text-white">
                {pendingBills.length}
              </p>
              <p className="text-xs sm:text-sm text-gray-400 truncate">Pending Bills</p>
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
              placeholder="Search bills by ID or service type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              All
            </Button>
            <Button
              variant={filterStatus === "paid" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("paid")}
            >
              Paid
            </Button>
            <Button
              variant={filterStatus === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("pending")}
            >
              Pending
            </Button>
          </div>
        </div>
      </Card>

      {/* Bills List */}
      <Card className="bg-gray-900 border-gray-800">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Bill History
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
                      <p className="text-gray-400 text-sm capitalize">
                        {bill.serviceType} • {bill.locationType === "home" ? "Home Service" : "Shop Service"}
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
                    <span className="text-xs px-2 py-1 rounded bg-gray-700">
                      {bill.items.length} items
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBill(bill)}
                      className="hover:bg-gray-700"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleShareOnWhatsApp(bill)}
                      className="hover:bg-gray-700 text-green-400 hover:text-green-300"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-gray-700">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-gray-700">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredBills.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No bills found</p>
                <p className="text-sm">No bills match your search criteria</p>
              </div>
            )}
          </div>
        </div>
      </Card>

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
              <Button className="flex-1">
                <Edit className="w-4 h-4 mr-2" />
                Edit Bill
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 