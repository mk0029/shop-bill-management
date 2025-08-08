"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/ui/dropdown";
import { useLocaleStore } from "@/store/locale-store";
import { useCustomers, useBills } from "@/hooks/use-sanity-data";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  Filter,
  Loader2,
} from "lucide-react";

interface CustomerWithStats {
  _id: string;
  clerkId: string;
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  // Calculated stats
  totalBills: number;
  totalSpent: number;
  lastBillDate: string | null;
}

const filterOptions = [
  { value: "all", label: "All Customers" },
  { value: "active", label: "Active Only" },
  { value: "inactive", label: "Inactive Only" },
];

export default function CustomersPage() {
  const { currency } = useLocaleStore();
  const router = useRouter();
  const { customers, isLoading: customersLoading } = useCustomers();
  const { bills, isLoading: billsLoading } = useBills();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithStats | null>(null);
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Calculate customer statistics
  const customersWithStats: CustomerWithStats[] = customers.map((customer) => {
    const customerBills = bills.filter(
      (bill) => bill.customer?._id === customer._id
    );
    const totalBills = customerBills.length;
    const totalSpent = customerBills
      .filter((bill) => bill.paymentStatus === "pending")
      .reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
    const lastBill = customerBills.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    return {
      ...customer,
      totalBills,
      totalSpent,
      lastBillDate: lastBill ? lastBill.createdAt.split("T")[0] : null,
    };
  });

  const filteredCustomers = customersWithStats.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterActive === "all" ||
      (filterActive === "active" && customer.isActive) ||
      (filterActive === "inactive" && !customer.isActive);
    return matchesSearch && matchesFilter;
  });

  const isLoading = customersLoading || billsLoading;

  const handleDeleteCustomer = (customerId: string) => {
    // TODO: Implement delete functionality
    console.log("Delete customer:", customerId);
  };

  return (
    <div className="space-y-6 pb-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Customer Management
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
            Manage customer accounts and view their activity
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/admin/customers/add")}>
          <Plus className="w-4 h-4 mr-1 sm:mr-2" />
          Add <span className="max-sm:hidden">Customer</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 md:gap-6 sm:gap-4 gap-3">
        <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  customersWithStats.length
                )}
              </p>
              <p className="text-sm text-gray-400">Total Customers</p>
            </div>
          </div>
        </Card>
        <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  customersWithStats.filter((c) => c.isActive).length
                )}
              </p>
              <p className="text-sm text-gray-400">Active Customers</p>
            </div>
          </div>
        </Card>
        <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  customersWithStats.reduce((sum, c) => sum + c.totalBills, 0)
                )}
              </p>
              <p className="text-sm text-gray-400">Total Bills</p>
            </div>
          </div>
        </Card>
        <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold !leading-[125%] text-white">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  `${currency}${customersWithStats
                    .reduce((sum, c) => sum + c.totalSpent, 0)
                    .toLocaleString()}`
                )}
              </p>
              <p className="text-sm text-gray-400">Total Revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="sm:p-4 p-3 bg-gray-900 border-gray-800">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search customers by name, phone, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <Dropdown
            options={filterOptions}
            value={filterActive}
            onValueChange={(value) =>
              setFilterActive(value as "all" | "active" | "inactive")
            }
            placeholder="Filter customers"
            searchable={false}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card className="bg-gray-900 border-gray-800">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Customers</h2>
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading customers...</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className=" h-6 w-6 sm:w-8 sm:h-8  animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-gray-400">Loading customer data...</p>
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No customers found</p>
              <p className="text-sm text-gray-500">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Add your first customer to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium  max-sm:hidden">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium max-sm:hidden">
                      Activity
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium  max-sm:hidden">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer, index) => (
                    <motion.tr
                      key={customer._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {customer.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {customer.name}
                            </p>
                            <p className="text-gray-400 text-sm">
                              ID: {customer.customerId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4  max-sm:hidden">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="text-white">{customer.phone}</span>
                          </div>
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-400">@</span>
                              <span className="text-gray-400">
                                {customer.email}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">
                              {customer.location}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4  max-sm:hidden">
                        <div className="space-y-1">
                          <p className="text-white text-sm">
                            {customer.totalBills} bills • {currency}
                            {customer.totalSpent.toLocaleString()}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {customer.lastBillDate
                              ? `Last: ${customer.lastBillDate}`
                              : "No bills yet"}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4  max-sm:hidden">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            customer.isActive
                              ? "bg-green-900 text-green-300"
                              : "bg-red-900 text-red-300"
                          }`}>
                          {customer.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCustomer(customer)}
                            className="hover:bg-gray-800">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-gray-800  max-sm:hidden">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCustomer(customer._id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Customer Details"
        size="lg">
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {selectedCustomer.name.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedCustomer.name}
                </h3>
                <p className="text-gray-400">
                  Customer ID: {selectedCustomer.clerkId}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Phone</p>
                <p className="text-white">{selectedCustomer.phone}</p>
              </div>
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Location</p>
                <p className="text-white">{selectedCustomer.location}</p>
              </div>
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Total Bills</p>
                <p className="text-white">{selectedCustomer.totalBills}</p>
              </div>
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Total Spent</p>
                <p className="text-white">
                  {currency}
                  {selectedCustomer.totalSpent.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Last Bill</p>
                <p className="text-white">{selectedCustomer.lastBillDate}</p>
              </div>
              <div className="p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm text-gray-400">Member Since</p>
                <p className="text-white">{selectedCustomer.createdAt}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1">View Bills</Button>
              <Button variant="outline" className="flex-1">
                Edit Customer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
