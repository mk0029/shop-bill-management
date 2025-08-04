"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/ui/dropdown";
import { useLocaleStore } from "@/store/locale-store";
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
} from "lucide-react";

interface Customer {
  id: string;
  clerkId: string;
  name: string;
  phone: string;
  location: string;
  totalBills: number;
  totalSpent: number;
  lastBillDate: string;
  createdAt: string;
  isActive: boolean;
}

// Mock data - will be replaced with real data from Sanity
const mockCustomers: Customer[] = [
  {
    id: "1",
    clerkId: "customer1",
    name: "John Doe",
    phone: "+91 9876543210",
    location: "Mumbai, Maharashtra",
    totalBills: 8,
    totalSpent: 15000,
    lastBillDate: "2025-01-15",
    createdAt: "2024-06-15",
    isActive: true,
  },
  {
    id: "2",
    clerkId: "customer2",
    name: "Jane Smith",
    phone: "+91 9876543211",
    location: "Delhi, India",
    totalBills: 6,
    totalSpent: 12500,
    lastBillDate: "2025-01-10",
    createdAt: "2024-07-20",
    isActive: true,
  },
  {
    id: "3",
    clerkId: "customer3",
    name: "Mike Johnson",
    phone: "+91 9876543212",
    location: "Bangalore, Karnataka",
    totalBills: 5,
    totalSpent: 10800,
    lastBillDate: "2025-01-08",
    createdAt: "2024-08-10",
    isActive: true,
  },
  {
    id: "4",
    clerkId: "customer4",
    name: "Sarah Wilson",
    phone: "+91 9876543213",
    location: "Chennai, Tamil Nadu",
    totalBills: 3,
    totalSpent: 7500,
    lastBillDate: "2024-12-28",
    createdAt: "2024-09-05",
    isActive: false,
  },
];

const filterOptions = [
  { value: "all", label: "All Customers" },
  { value: "active", label: "Active Only" },
  { value: "inactive", label: "Inactive Only" },
];

export default function CustomersPage() {
  const { currency } = useLocaleStore();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");

  const filteredCustomers = mockCustomers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterActive === "all" ||
      (filterActive === "active" && customer.isActive) ||
      (filterActive === "inactive" && !customer.isActive);
    return matchesSearch && matchesFilter;
  });

  const handleDeleteCustomer = (customerId: string) => {
    // TODO: Implement delete functionality
    console.log("Delete customer:", customerId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Customer Management</h1>
          <p className="text-gray-400 mt-1">
            Manage customer accounts and view their activity
          </p>
        </div>
        <Button onClick={() => router.push("/admin/customers/add")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {mockCustomers.length}
              </p>
              <p className="text-sm text-gray-400">Total Customers</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {mockCustomers.filter((c) => c.isActive).length}
              </p>
              <p className="text-sm text-gray-400">Active Customers</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {mockCustomers.reduce((sum, c) => sum + c.totalBills, 0)}
              </p>
              <p className="text-sm text-gray-400">Total Bills</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gray-900 border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {currency}
                {mockCustomers
                  .reduce((sum, c) => sum + c.totalSpent, 0)
                  .toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">Total Revenue</p>
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
              placeholder="Search customers by name, phone, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>
          <Dropdown
            options={filterOptions}
            value={filterActive}
            onValueChange={(value) => setFilterActive(value as "all" | "active" | "inactive")}
            placeholder="Filter customers"
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Customers Table */}
      <Card className="bg-gray-900 border-gray-800">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Customers</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Contact
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
                    Activity
                  </th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">
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
                    key={customer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="py-4 px-4">
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
                            ID: {customer.clerkId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-white">{customer.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-400">
                            {customer.location}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <p className="text-white text-sm">
                          {customer.totalBills} bills • {currency}
                          {customer.totalSpent.toLocaleString()}
                        </p>
                        <p className="text-gray-400 text-xs">
                          Last: {customer.lastBillDate}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          customer.isActive
                            ? "bg-green-900 text-green-300"
                            : "bg-red-900 text-red-300"
                        }`}
                      >
                        {customer.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCustomer(customer)}
                          className="hover:bg-gray-800"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="hover:bg-gray-800">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Customer Details"
        size="lg"
      >
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
                <p className="text-white">
                  {selectedCustomer.lastBillDate}
                </p>
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
