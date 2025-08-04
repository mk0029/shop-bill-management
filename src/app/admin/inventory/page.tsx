"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/store/locale-store";
import {
  Package,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  BarChart3,
  DollarSign,
  Zap,
} from "lucide-react";
import { InventoryItem, StockTransaction } from "@/types";

// Mock data - will be replaced with real data
const mockInventoryItems: InventoryItem[] = [
  {
    id: "1",
    name: "LED Bulb",
    category: "light",
    lightType: "led",
    color: "white",
    watts: 5,
    brand: "Philips",
    purchasePrice: 67,
    sellingPrice: 90,
    currentStock: 25,
    minimumStock: 10,
    unit: "piece",
    description: "5W LED bulb, white color",
    isActive: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-15"),
  },
  {
    id: "2",
    name: "LED Bulb",
    category: "light",
    lightType: "led",
    color: "warm-white",
    watts: 5,
    brand: "Havells",
    purchasePrice: 69,
    sellingPrice: 95,
    currentStock: 18,
    minimumStock: 10,
    unit: "piece",
    description: "5W LED bulb, warm white color",
    isActive: true,
    createdAt: new Date("2025-01-02"),
    updatedAt: new Date("2025-01-14"),
  },
  {
    id: "3",
    name: "Panel Light",
    category: "light",
    lightType: "panel",
    color: "white",
    size: "medium",
    watts: 12,
    brand: "Crompton",
    purchasePrice: 120,
    sellingPrice: 180,
    currentStock: 8,
    minimumStock: 5,
    unit: "piece",
    description: "12W panel light, medium size",
    isActive: true,
    createdAt: new Date("2025-01-03"),
    updatedAt: new Date("2025-01-13"),
  },
  {
    id: "4",
    name: "Electric Wire",
    category: "wire",
    wireGauge: "1.5mm",
    brand: "Finolex",
    purchasePrice: 45,
    sellingPrice: 65,
    currentStock: 150,
    minimumStock: 50,
    unit: "meter",
    description: "1.5mm electric wire",
    isActive: true,
    createdAt: new Date("2025-01-04"),
    updatedAt: new Date("2025-01-12"),
  },
  {
    id: "5",
    name: "MCB Switch",
    category: "mcb",
    ampere: "16A",
    brand: "Schneider",
    purchasePrice: 85,
    sellingPrice: 120,
    currentStock: 12,
    minimumStock: 8,
    unit: "piece",
    description: "16A MCB switch",
    isActive: true,
    createdAt: new Date("2025-01-05"),
    updatedAt: new Date("2025-01-11"),
  },
];

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "light", label: "Lights" },
  { value: "motor", label: "Motors" },
  { value: "pump", label: "Pumps" },
  { value: "wire", label: "Wires" },
  { value: "switch", label: "Switches" },
  { value: "socket", label: "Sockets" },
  { value: "mcb", label: "MCB" },
  { value: "other", label: "Others" },
];

const stockStatusOptions = [
  { value: "all", label: "All Stock" },
  { value: "in-stock", label: "In Stock" },
  { value: "low-stock", label: "Low Stock" },
  { value: "out-of-stock", label: "Out of Stock" },
];

const getStockStatus = (item: InventoryItem) => {
  if (item.currentStock === 0) return "out-of-stock";
  if (item.currentStock <= item.minimumStock) return "low-stock";
  return "in-stock";
};

const getStockStatusColor = (status: string) => {
  switch (status) {
    case "in-stock":
      return "text-green-400";
    case "low-stock":
      return "text-yellow-400";
    case "out-of-stock":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

const getStockStatusIcon = (status: string) => {
  switch (status) {
    case "in-stock":
      return TrendingUp;
    case "low-stock":
      return AlertTriangle;
    case "out-of-stock":
      return TrendingDown;
    default:
      return Package;
  }
};

export default function InventoryPage() {
  const router = useRouter();
  const { currency } = useLocaleStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  const filteredItems = mockInventoryItems.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    
    const itemStockStatus = getStockStatus(item);
    const matchesStockStatus = stockStatusFilter === "all" || itemStockStatus === stockStatusFilter;
    
    return matchesSearch && matchesCategory && matchesStockStatus;
  });

  const totalItems = mockInventoryItems.length;
  const totalValue = mockInventoryItems.reduce((sum, item) => sum + (item.currentStock * item.sellingPrice), 0);
  const lowStockItems = mockInventoryItems.filter(item => getStockStatus(item) === "low-stock").length;
  const outOfStockItems = mockInventoryItems.filter(item => getStockStatus(item) === "out-of-stock").length;

  const viewItemDetails = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const getItemSpecifications = (item: InventoryItem) => {
    const specs = [];
    
    if (item.lightType) specs.push(`Type: ${item.lightType}`);
    if (item.color) specs.push(`Color: ${item.color}`);
    if (item.size) specs.push(`Size: ${item.size}`);
    if (item.watts) specs.push(`Watts: ${item.watts}W`);
    if (item.wireGauge) specs.push(`Gauge: ${item.wireGauge}`);
    if (item.ampere) specs.push(`Ampere: ${item.ampere}`);
    
    return specs.join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
          <p className="text-gray-400 mt-1">
            Track stock levels, manage items, and monitor inventory value
          </p>
        </div>
        <Button onClick={() => router.push("/admin/inventory/add")}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Items</p>
                <p className="text-2xl font-bold text-white mt-1">{totalItems}</p>
              </div>
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Value</p>
                <p className="text-2xl font-bold text-white mt-1">{currency}{totalValue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">{lowStockItems}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Out of Stock</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{outOfStockItems}</p>
              </div>
              <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, brand, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              />
            </div>
            <div className="flex gap-3">
              <Dropdown
                options={categoryOptions}
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                placeholder="Filter by category"
                className="bg-gray-800 border-gray-700"
              />
              <Dropdown
                options={stockStatusOptions}
                value={stockStatusFilter}
                onValueChange={setStockStatusFilter}
                placeholder="Filter by stock"
                className="bg-gray-800 border-gray-700"
              />
              <Button variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Item</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Brand</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Stock</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Purchase Price</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Selling Price</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Value</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const stockStatus = getStockStatus(item);
                  const StatusIcon = getStockStatusIcon(stockStatus);
                  const itemValue = item.currentStock * item.sellingPrice;
                  
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-sm text-gray-400">{getItemSpecifications(item)}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white">{item.brand}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${getStockStatusColor(stockStatus)}`} />
                          <span className={`font-medium ${getStockStatusColor(stockStatus)}`}>
                            {item.currentStock} {item.unit}
                          </span>
                        </div>
                        {item.currentStock <= item.minimumStock && (
                          <p className="text-xs text-yellow-400 mt-1">
                            Min: {item.minimumStock} {item.unit}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300">{currency}{item.purchasePrice}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-white font-medium">{currency}{item.sellingPrice}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-green-400 font-medium">{currency}{itemValue.toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewItemDetails(item)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/inventory/edit/${item.id}`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No items found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Details Modal */}
      <Modal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        size="lg"
        title={selectedItem?.name}
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Item Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Item Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Category</p>
                  <p className="text-white capitalize">{selectedItem.category}</p>
                </div>
                <div>
                  <p className="text-gray-400">Brand</p>
                  <p className="text-white">{selectedItem.brand}</p>
                </div>
                <div>
                  <p className="text-gray-400">Specifications</p>
                  <p className="text-white">{getItemSpecifications(selectedItem)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Unit</p>
                  <p className="text-white">{selectedItem.unit}</p>
                </div>
              </div>
            </div>

            {/* Stock Information */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Stock Information</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Current Stock</p>
                  <p className="text-white font-medium">{selectedItem.currentStock} {selectedItem.unit}</p>
                </div>
                <div>
                  <p className="text-gray-400">Minimum Stock</p>
                  <p className="text-white">{selectedItem.minimumStock} {selectedItem.unit}</p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <p className={`font-medium ${getStockStatusColor(getStockStatus(selectedItem))}`}>
                    {getStockStatus(getStockStatus(selectedItem))}
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-white mb-3">Pricing Information</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Purchase Price</p>
                  <p className="text-gray-300">{currency}{selectedItem.purchasePrice}</p>
                </div>
                <div>
                  <p className="text-gray-400">Selling Price</p>
                  <p className="text-white font-medium">{currency}{selectedItem.sellingPrice}</p>
                </div>
                <div>
                  <p className="text-gray-400">Total Value</p>
                  <p className="text-green-400 font-medium">
                    {currency}{(selectedItem.currentStock * selectedItem.sellingPrice).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => router.push(`/admin/inventory/edit/${selectedItem.id}`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Item
              </Button>
              <Button variant="outline" onClick={() => setShowItemModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 