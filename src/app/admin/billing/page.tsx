/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useBills, useCustomers, useProducts } from "@/hooks/use-sanity-data";
import { useSeamlessRealtime } from "@/hooks/use-seamless-realtime";
import {
  RealtimeBillList,
  RealtimeBillStats,
} from "@/components/realtime/realtime-bill-list";
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

// WhatsApp sharing utility function
const shareBillOnWhatsApp = (bill: Bill) => {
  const message = `Bill Details:\n\nBill Number: ${bill.id}\nCustomer: ${
    bill.customerName
  }\nDate: ${bill.date}\nAmount: ₹${bill.total}\n\nItems:\n${bill.items
    .map(
      (item) =>
        `- ${item.name}: ${item.quantity} x ₹${item.price} = ₹${item.total}`
    )
    .join("\n")}\n\nTotal: ₹${bill.total}`;
  const encodedMessage = encodeURIComponent(message);
  const customerPhone = bill.customerId; // Assuming customerId contains phone for now
  const whatsappUrl = `https://wa.me/${customerPhone.replace(
    /[^0-9]/g,
    ""
  )}?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
};

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
  const { bills, isLoading: billsLoading } = useBills();
  const { customers, isLoading: customersLoading } = useCustomers();
  const { products, isLoading: productsLoading } = useProducts();
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Enable seamless real-time updates in the background
  useSeamlessRealtime();

  // Transform bills data to match the expected format
  const transformedBills: Bill[] = bills.map((bill) => ({
    id: bill._id,
    customerName: bill.customer?.name || "Unknown Customer",
    customerId: bill.customer?._id || "",
    date: bill.serviceDate
      ? new Date(bill.serviceDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    items:
      bill.items?.map((item) => ({
        name: item.productName || "Unknown Item",
        quantity: item.quantity || 0,
        price: item.unitPrice || 0,
        total: item.totalPrice || 0,
      })) || [],
    serviceType: bill.serviceType || "sale",
    locationType: bill.locationType || "shop",
    homeVisitFee: bill.homeVisitFee || 0,
    subtotal: bill.subtotal || 0,
    total: bill.totalAmount || 0,
    status: bill.paymentStatus === "paid" ? "paid" : "pending",
    notes: bill.notes,
  }));

  // Transform customers data
  const transformedCustomers: Customer[] = customers.map((customer) => ({
    id: customer._id,
    name: customer.name,
    phone: customer.phone,
    location: customer.location,
  }));

  // Transform products data
  const transformedItems: Item[] = products.map((product) => ({
    id: product._id,
    name: product.name,
    price: product.pricing?.sellingPrice || 0,
    category: product.category?.name || "general",
  }));

  const filteredBills = transformedBills.filter(
    (bill) =>
      (bill.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.id.includes(searchTerm)) &&
      (filterStatus === "all" || bill.status === filterStatus)
  );

  const isLoading = billsLoading || customersLoading || productsLoading;

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
    const customer = transformedCustomers.find((c) => c.id === bill.customerId);
    const billWithPhone = {
      ...bill,
      customerId: customer?.phone || bill.customerId,
    };
    shareBillOnWhatsApp(billWithPhone);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <FileText className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-400" />
            Billing Management
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Create and manage customer bills
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin/billing/create")}
          className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Bill
        </Button>
      </div>

      {/* Bill Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          Bill Statistics
        </h2>
        <RealtimeBillStats initialBills={bills} />
      </div>

      {/* Search and Filter */}
      <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
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
        <div className="p-4 md:p-6 max-h-dvh  flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Bill
          </h2>
          <div className="overflow-auto flex grow flex-col">
            <RealtimeBillList
              initialBills={bills}
              onBillClick={(bill) =>
                handleViewBill({
                  id: bill._id,
                  customerName: bill.customer?.name || "Unknown Customer",
                  customerId: bill.customer?._id || "",
                  date: bill.serviceDate
                    ? new Date(bill.serviceDate).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0],
                  items:
                    bill.items?.map((item: any) => ({
                      name: item.productName || "Unknown Item",
                      quantity: item.quantity || 0,
                      price: item.unitPrice || 0,
                      total: item.totalPrice || 0,
                    })) || [],
                  serviceType: bill.serviceType || "sale",
                  locationType: bill.locationType || "shop",
                  homeVisitFee: bill.homeVisitFee || 0,
                  subtotal: bill.subtotal || 0,
                  total: bill.totalAmount || 0,
                  status: bill.paymentStatus === "paid" ? "paid" : "pending",
                  notes: bill.notes,
                })
              }
              showNewBillAnimation={true}
            />
          </div>
        </div>
      </Card>

      {/* Bill Form */}
      <BillForm
        isOpen={showCreateBill}
        onClose={() => setShowCreateBill(false)}
        onSubmit={handleCreateBill}
        customers={transformedCustomers}
        items={transformedItems}
      />

      {/* Bill Detail Modal */}
      <Modal
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        title={`Bill Details #${selectedBill?.id}`}
        size="lg">
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
                    className="flex justify-between p-3 bg-gray-800 rounded border border-gray-700">
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
                onClick={() =>
                  handleViewCustomerBills(selectedBill.customerId)
                }>
                <User className="w-4 h-4 mr-2" />
                <span className="max-sm:hidden">View Customer Bills</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleShareOnWhatsApp(selectedBill)}>
                <Share2 className="w-4 h-4 mr-2" />
                <span className="max-sm:hidden">Share on WhatsApp</span>
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                <span className="max-sm:hidden">Download Bill</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
