"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  User, 
  Phone,
  Share2,
  Eye,
  ArrowLeft,
  Clock,
  AlertTriangle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { currency } from "@/lib/inventory-data";
import { shareBillOnWhatsApp, getWhatsAppConfig, BillDetails } from "@/lib/whatsapp-utils";

interface Bill {
  id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  billDate: string;
  dueDate: string;
  total: number;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  notes?: string;
}

// Mock pending bills data
const mockPendingBills: Bill[] = [
  {
    id: "1",
    billNumber: "BILL-001",
    customerName: "John Doe",
    customerPhone: "+919876543210",
    billDate: "2025-01-15",
    dueDate: "2025-01-30",
    total: 2500,
    status: "pending",
    items: [
      { name: "LED Bulb - Havells (Type: LED, Color: White, 5W)", quantity: 5, price: 90, total: 450 },
      { name: "Wire - Polycab (Gauge: 1.5 sq mm)", quantity: 10, price: 150, total: 1500 },
      { name: "MCB - Anchor (16A)", quantity: 2, price: 275, total: 550 }
    ],
    subtotal: 2500,
    notes: "Installation required"
  },
  {
    id: "2",
    billNumber: "BILL-002",
    customerName: "Jane Smith",
    customerPhone: "+919876543211",
    billDate: "2025-01-14",
    dueDate: "2025-01-29",
    total: 1800,
    status: "pending",
    items: [
      { name: "Panel Light - Philips (Type: Panel, Color: White, 20W)", quantity: 3, price: 600, total: 1800 }
    ],
    subtotal: 1800,
    notes: "Urgent delivery"
  },
  {
    id: "3",
    billNumber: "BILL-003",
    customerName: "Mike Johnson",
    customerPhone: "+919876543212",
    billDate: "2025-01-13",
    dueDate: "2025-01-28",
    total: 3200,
    status: "pending",
    items: [
      { name: "Motor - Crompton (1000W)", quantity: 1, price: 2500, total: 2500 },
      { name: "Switch - Anchor (16A)", quantity: 5, price: 140, total: 700 }
    ],
    subtotal: 3200,
    notes: "Industrial installation"
  }
];

export default function PendingBillsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Filter bills based on search and status
  const filteredBills = mockPendingBills.filter(bill => {
    const matchesSearch = 
      bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.customerPhone.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || bill.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const handleShareOnWhatsApp = (bill: Bill) => {
    const billDetails: BillDetails = {
      billNumber: bill.billNumber,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      items: bill.items,
      subtotal: bill.subtotal,
      total: bill.total,
      notes: bill.notes
    };
    
    shareBillOnWhatsApp(billDetails);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "overdue":
        return "bg-red-500";
      case "paid":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "overdue":
        return "Overdue";
      case "paid":
        return "Paid";
      default:
        return "Unknown";
    }
  };

  const totalPendingAmount = filteredBills.reduce((sum, bill) => sum + bill.total, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Pending Bills</h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Manage and track all pending payments
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin/billing")}
          variant="outline"
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Billing
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs sm:text-sm">Total Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-white truncate">{currency}{totalPendingAmount.toLocaleString()}</p>
              </div>
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs sm:text-sm">Pending Bills</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{filteredBills.length}</p>
              </div>
              <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-gray-400 text-xs sm:text-sm">Overdue Bills</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {filteredBills.filter(bill => bill.status === "overdue").length}
                </p>
              </div>
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by customer name, bill number, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
          />
        </div>
        <Dropdown
          options={[
            { value: "all", label: "All Status" },
            { value: "pending", label: "Pending" },
            { value: "overdue", label: "Overdue" }
          ]}
          value={statusFilter}
          onValueChange={setStatusFilter}
          placeholder="Filter by status"
          className="bg-gray-800 border-gray-700 w-full sm:w-auto"
        />
      </div>

      {/* Bills List */}
      <div className="space-y-4">
        {filteredBills.map((bill) => (
          <Card key={bill.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">{bill.billNumber}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bill.status)} text-white`}>
                      {getStatusText(bill.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-400 text-xs">Customer</p>
                      <p className="text-white font-medium truncate">{bill.customerName}</p>
                      <p className="text-gray-400 text-xs truncate">{bill.customerPhone}</p>
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-gray-400 text-xs">Dates</p>
                      <p className="text-white text-xs">Bill: {bill.billDate}</p>
                      <p className="text-white text-xs">Due: {bill.dueDate}</p>
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-gray-400 text-xs">Amount</p>
                      <p className="text-white font-semibold truncate">{currency}{bill.total.toLocaleString()}</p>
                      <p className="text-gray-400 text-xs">{bill.items.length} items</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewBill(bill)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Eye className="w-3 h-3" />
                    <span className="hidden sm:inline">View</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleShareOnWhatsApp(bill)}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-xs"
                  >
                    <Share2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBills.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Pending Bills</h3>
            <p className="text-gray-400">
              No bills match your current filters.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bill Details Modal */}
      <Modal
        isOpen={showBillModal}
        onClose={() => setShowBillModal(false)}
        size="lg"
        title={`Bill Details - ${selectedBill?.billNumber}`}
      >
        {selectedBill && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Name</p>
                  <p className="text-white">{selectedBill.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Phone</p>
                  <p className="text-white">{selectedBill.customerPhone}</p>
                </div>
                <div>
                  <p className="text-gray-400">Bill Date</p>
                  <p className="text-white">{selectedBill.billDate}</p>
                </div>
                <div>
                  <p className="text-gray-400">Due Date</p>
                  <p className="text-white">{selectedBill.dueDate}</p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="font-medium text-white mb-3">Items</h4>
              <div className="space-y-2">
                {selectedBill.items.map((item, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-gray-400 text-sm">Qty: {item.quantity} × {currency}{item.price}</p>
                    </div>
                    <p className="text-white font-semibold">{currency}{item.total}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white">{currency}{selectedBill.subtotal}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span className="text-white">Total</span>
                  <span className="text-white">{currency}{selectedBill.total}</span>
                </div>
              </div>
            </div>

            {selectedBill.notes && (
              <div>
                <h4 className="font-medium text-white mb-2">Notes</h4>
                <p className="text-gray-400 bg-gray-800 p-3 rounded-lg">{selectedBill.notes}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => handleShareOnWhatsApp(selectedBill)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Share2 className="w-4 h-4" />
                Share on WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBillModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 