"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useRouter } from "next/navigation";
import {
  useCustomers,
  useProducts,
  useBrands,
  useCategories,
} from "@/hooks/use-sanity-data";
import { useLocaleStore } from "@/store/locale-store";
import {
  ArrowLeft,
  Save,
  User,
  FileText,
  DollarSign,
  Trash2,
  Package,
} from "lucide-react";
import { createBill } from "@/lib/form-service";

interface Product {
  _id: string;
  name: string;
  category?: { name: string };
  brand?: { name: string };
  specifications?: {
    lightType?: string;
    color?: string;
    size?: string;
    wattage?: number;
    wireGauge?: string;
    amperage?: string;
  };
  inventory: {
    currentStock: number;
  };
  pricing: {
    sellingPrice: number;
    unit: string;
  };
}

// Helper function to get item display name from real product data
const getItemDisplayName = (product: Product) => {
  const specs = [];

  // Extract specifications from the product's specifications object
  if (product.specifications) {
    const spec = product.specifications;
    if (spec.lightType) specs.push(spec.lightType);
    if (spec.color) specs.push(spec.color);
    if (spec.size) specs.push(spec.size);
    if (spec.wattage) specs.push(`${spec.wattage}W`);
    if (spec.wireGauge) specs.push(`${spec.wireGauge}mm`);
    if (spec.amperage) specs.push(`${spec.amperage}A`);
  }

  const categoryName = product.category?.name || "Product";
  const brandName = product.brand?.name || "Unknown Brand";
  const specString = specs.length > 0 ? ` (${specs.join(", ")})` : "";

  return `${categoryName} - ${brandName}${specString}`;
};

// Helper function to get item specifications for display
const getItemSpecifications = (product: Product) => {
  const specs = [];

  if (product.specifications) {
    const spec = product.specifications;
    if (spec.lightType) specs.push(`Type: ${spec.lightType}`);
    if (spec.color) specs.push(`Color: ${spec.color}`);
    if (spec.size) specs.push(`Size: ${spec.size}`);
    if (spec.wattage) specs.push(`${spec.wattage}W`);
    if (spec.wireGauge) specs.push(`Gauge: ${spec.wireGauge}mm`);
    if (spec.amperage) specs.push(`${spec.amperage}A`);
  }

  return specs.join(", ");
};

// Using inventory data from helper file

const serviceTypeOptions = [
  { value: "sale", label: "Sale" },
  { value: "repair", label: "Repair" },
  { value: "custom", label: "Custom" },
];

const locationOptions = [
  { value: "home", label: "Home Service" },
  { value: "shop", label: "Shop Service" },
];

interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  category: string;
  brand: string;
  specifications: string;
  unit: string;
}

interface ItemSelectionModal {
  isOpen: boolean;
  selectedCategory: string;
  selectedSpecifications: {
    brand?: string;
    color?: string;
    watts?: string;
    size?: string;
    wireGauge?: string;
    ampere?: string;
  };
}

export default function CreateBillPage() {
  const router = useRouter();
  const { currency } = useLocaleStore();
  const { customers, isLoading: customersLoading } = useCustomers();
  const { activeProducts, isLoading: productsLoading } = useProducts();
  const { brands } = useBrands();
  const { categories } = useCategories();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<BillItem[]>([]);
  const [itemSelectionModal, setItemSelectionModal] =
    useState<ItemSelectionModal>({
      isOpen: false,
      selectedCategory: "",
      selectedSpecifications: {},
    });

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const [formData, setFormData] = useState({
    customerId: "",
    serviceType: "",
    location: "",
    billDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    repairCharges: 0,
    homeVisitFee: 0,
    laborCharges: 0,
  });

  const handleInputChange = (field: string, value: string) => {
    // Convert numeric fields to numbers
    if (["repairCharges", "homeVisitFee", "laborCharges"].includes(field)) {
      const numericValue = Number(value) || 0;
      setFormData((prev) => ({ ...prev, [field]: numericValue }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const addItemToBill = (product: Product) => {
    const existingItem = selectedItems.find((i) => i.id === product._id);
    const maxStock = product.inventory.currentStock;
    if (existingItem) {
      if (existingItem.quantity < maxStock) {
        setSelectedItems((prev) =>
          prev.map((i) =>
            i.id === product._id
              ? {
                  ...i,
                  quantity: i.quantity + 1,
                  total: Number(i.quantity + 1) * Number(i.price),
                }
              : i
          )
        );
      } else {
        setAlertMessage(`Only ${maxStock} in stock!`);
        setShowAlertModal(true);
      }
    } else {
      const specifications = getItemSpecifications(product);
      setSelectedItems((prev) => [
        ...prev,
        {
          id: product._id,
          name: getItemDisplayName(product),
          price: Number(product.pricing.sellingPrice),
          quantity: 1,
          total: Number(product.pricing.sellingPrice),
          category: product.category?.name || "Unknown",
          brand: product.brand?.name || "Unknown",
          specifications,
          unit: product.pricing.unit,
        },
      ]);
    }
  };

  const openItemSelectionModal = (category: string) => {
    setItemSelectionModal({
      isOpen: true,
      selectedCategory: category,
      selectedSpecifications: {},
    });
  };

  const closeItemSelectionModal = () => {
    setItemSelectionModal({
      isOpen: false,
      selectedCategory: "",
      selectedSpecifications: {},
    });
  };

  const filterItemsBySpecifications = () => {
    // Get products by category
    let filteredItems = activeProducts.filter(
      (product) =>
        product.category?.name?.toLowerCase() ===
          itemSelectionModal.selectedCategory.toLowerCase() &&
        product.inventory.currentStock > 0 &&
        product.isActive
    );

    const { selectedSpecifications } = itemSelectionModal;

    // Filter by brand
    if (selectedSpecifications.brand) {
      filteredItems = filteredItems.filter(
        (product) => product.brand?.name === selectedSpecifications.brand
      );
    }

    // Filter by specifications
    if (selectedSpecifications.color) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.color === selectedSpecifications.color
      );
    }
    if (selectedSpecifications.watts) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.wattage?.toString() ===
          selectedSpecifications.watts
      );
    }
    if (selectedSpecifications.size) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.size === selectedSpecifications.size
      );
    }
    if (selectedSpecifications.wireGauge) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.wireGauge === selectedSpecifications.wireGauge
      );
    }
    if (selectedSpecifications.ampere) {
      filteredItems = filteredItems.filter(
        (product) =>
          product.specifications?.amperage === selectedSpecifications.ampere
      );
    }

    return filteredItems;
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    const product = activeProducts.find((p) => p._id === itemId);
    const maxStock = product ? product.inventory.currentStock : Infinity;
    const clampedQuantity = Math.max(1, Math.min(quantity, maxStock));
    if (clampedQuantity <= 0) {
      setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
    } else {
      setSelectedItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                quantity: clampedQuantity,
                total: Number(clampedQuantity) * Number(i.price),
              }
            : i
        )
      );
    }
  };

  const removeItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const calculateTotal = () => {
    return selectedItems.reduce((sum, item) => sum + Number(item.total), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setAlertMessage("Please add at least one item to the bill");
      setShowAlertModal(true);
      return;
    }

    setIsLoading(true);

    try {
      // Prepare bill data for API
      const billData = {
        customerId: formData.customerId,
        items: selectedItems.map((item) => ({
          productId: item.id,
          productName: item.name,
          category: item.category,
          brand: item.brand,
          specifications: item.specifications,
          quantity: Number(item.quantity),
          unitPrice: Number(item.price),
          unit: item.unit,
        })),
        serviceType: formData.serviceType as
          | "sale"
          | "repair"
          | "custom"
          | "installation"
          | "maintenance",
        locationType: formData.location as "home" | "shop" | "office",
        homeVisitFee: Number(formData.homeVisitFee),
        repairCharges: Number(formData.repairCharges),
        laborCharges: Number(formData.laborCharges),
        notes: formData.notes,
      };

      console.log("Sending bill data:", billData);
      console.log("Bill data types:", {
        homeVisitFeeType: typeof billData.homeVisitFee,
        repairChargesType: typeof billData.repairCharges,
        laborChargesType: typeof billData.laborCharges,
        homeVisitFeeValue: billData.homeVisitFee,
        repairChargesValue: billData.repairCharges,
        laborChargesValue: billData.laborCharges,
      });
      const result = await createBill(billData);
      if (result.success) {
        setShowSuccessModal(true);
      } else {
        setAlertMessage(result.error || "Failed to create bill");
        setShowAlertModal(true);
      }
    } catch (error) {
      console.error("Error creating bill:", error);
      setAlertMessage("Error creating bill");
      setShowAlertModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.push("/admin/billing");
  };

  const selectedCustomer = customers.find((c) => c._id === formData.customerId);

  return (
    <div className="space-y-6 max-md:pb-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Create New Bill
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Generate a new invoice for your customer
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerId" className="text-gray-300">
                    Select Customer *
                  </Label>
                  <Dropdown
                    options={customers.map((c) => ({
                      value: c._id,
                      label: `${c.name} (${c.phone}) - ${c.location}`,
                    }))}
                    value={formData.customerId}
                    onValueChange={(value) =>
                      handleInputChange("customerId", value)
                    }
                    placeholder={
                      customersLoading
                        ? "Loading customers..."
                        : customers.length === 0
                        ? "No customers found"
                        : "Choose customer"
                    }
                    searchable={true}
                    searchPlaceholder="Search customers..."
                    className="bg-gray-800 border-gray-700"
                    disabled={customersLoading || customers.length === 0}
                  />
                  {customers.length === 0 && !customersLoading && (
                    <div className="text-xs text-yellow-400">
                      <p>No customers available.</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => router.push("/admin/customers/add")}
                        className="text-blue-400 hover:text-blue-300 p-0 h-auto text-xs">
                        Add your first customer →
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceType" className="text-gray-300">
                    Service Type *
                  </Label>
                  <Dropdown
                    options={serviceTypeOptions}
                    value={formData.serviceType}
                    onValueChange={(value) =>
                      handleInputChange("serviceType", value)
                    }
                    placeholder="Select service type"
                    searchable={false}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-gray-300">
                    Location Type *
                  </Label>
                  <Dropdown
                    options={locationOptions}
                    value={formData.location}
                    onValueChange={(value) =>
                      handleInputChange("location", value)
                    }
                    placeholder="Select location type"
                    searchable={false}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billDate" className="text-gray-300">
                    Bill Date *
                  </Label>
                  <Input
                    id="billDate"
                    type="date"
                    value={formData.billDate}
                    onChange={(e) =>
                      handleInputChange("billDate", e.target.value)
                    }
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-gray-300">
                    Due Date
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      handleInputChange("dueDate", e.target.value)
                    }
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-300">
                  Notes
                </Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any additional notes..."
                />
              </div>

              {/* Repair Charges */}
              {formData.serviceType === "repair" && (
                <div className="space-y-2">
                  <Label htmlFor="repairCharges" className="text-gray-300">
                    Repair Charges ({currency})
                  </Label>
                  <Input
                    id="repairCharges"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.repairCharges || ""}
                    onChange={(e) =>
                      handleInputChange("repairCharges", e.target.value)
                    }
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Enter repair charges"
                  />
                </div>
              )}

              {/* Home Visit Fee */}
              {formData.location === "home" ||
                (formData.serviceType === "repair" && (
                  <div className="space-y-2">
                    <Label htmlFor="homeVisitFee" className="text-gray-300">
                      Home Visit Fee ({currency})
                    </Label>
                    <Input
                      id="homeVisitFee"
                      type="number"
                      min="50"
                      max="200"
                      step="1"
                      value={formData.homeVisitFee || ""}
                      onChange={(e) =>
                        handleInputChange("homeVisitFee", e.target.value)
                      }
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="50-200"
                    />
                    <p className="text-xs text-gray-400">
                      Minimum ₹50, Maximum ₹200
                    </p>
                  </div>
                ))}
              {formData.location === "home" && (
                <div className="space-y-2">
                  <Label htmlFor="laborCharges" className="text-gray-300">
                    Labor Charges ({currency})
                  </Label>
                  <Input
                    id="laborCharges"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.laborCharges || ""}
                    onChange={(e) =>
                      handleInputChange("laborCharges", e.target.value)
                    }
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Enter labor charges"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Selection */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Bill Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {/* Dynamic Category Buttons */}
                {categories.map((category) => {
                  const categoryProducts = activeProducts.filter(
                    (product) =>
                      product.category?.name?.toLowerCase() ===
                        category.name.toLowerCase() &&
                      product.inventory.currentStock > 0 &&
                      product.isActive
                  );

                  return (
                    <motion.div
                      key={category._id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outline"
                        onClick={() =>
                          openItemSelectionModal(category.name.toLowerCase())
                        }
                        className="w-full h-auto p-3 flex flex-col items-start gap-2 bg-gray-800 border-gray-700 hover:bg-gray-700"
                        disabled={categoryProducts.length === 0}>
                        <div className="text-left">
                          <p className="font-medium text-white">
                            {category.name}
                          </p>
                          <p className="text-sm text-gray-400">
                            {category.description ||
                              `${category.name} products`}
                          </p>
                          <p className="text-sm text-blue-400">
                            {categoryProducts.length} items available
                          </p>
                        </div>
                      </Button>
                    </motion.div>
                  );
                })}

                {/* Show loading state if categories are loading */}
                {productsLoading && (
                  <div className="col-span-full text-center py-8">
                    <div className=" h-6 w-6 sm:w-8 sm:h-8  border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading categories...</p>
                  </div>
                )}
              </div>

              {/* Selected Items */}
              {selectedItems.length > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-white">
                      Selected Items ({selectedItems.length})
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedItems([])}
                      className="text-red-400 hover:text-red-300 text-xs">
                      Clear All
                    </Button>
                  </div>
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="sm:p-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-white text-sm">
                              {item.name}
                            </p>
                            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mb-1">
                            {item.brand}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.specifications}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-blue-400 font-medium">
                            {currency}
                            {item.price} each
                          </p>
                          <p className="text-xs text-gray-500">
                            Stock available
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateItemQuantity(item.id, item.quantity - 1)
                              }
                              className=" h-6 w-6 sm:w-8 sm:h-8  p-0 text-xs">
                              -
                            </Button>
                            <span className="text-white font-medium w-8 text-center text-sm">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateItemQuantity(item.id, item.quantity + 1)
                              }
                              className=" h-6 w-6 sm:w-8 sm:h-8  p-0 text-xs">
                              +
                            </Button>
                          </div>
                          <span className="text-xs text-gray-400">Qty</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-white text-sm">
                              {currency}
                              {item.total}
                            </p>
                            <p className="text-xs text-gray-400">
                              {item.quantity} × {currency}
                              {item.price}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="bg-gray-900 border-gray-800 sticky top-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Bill Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCustomer && (
                <div className="p-3 bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Customer</h4>
                  <p className="text-gray-300">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-400">
                    {selectedCustomer.phone}
                  </p>
                  {selectedCustomer.email && (
                    <p className="text-sm text-gray-400">
                      {selectedCustomer.email}
                    </p>
                  )}
                  <p className="text-sm text-gray-400">
                    📍 {selectedCustomer.location}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {selectedCustomer.customerId}
                  </p>
                </div>
              )}

              <div className="space-y-2 sm:space-y-3">
                {/* Items Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Items ({selectedItems.length})</span>
                    <span>
                      {currency}
                      {calculateTotal()}
                    </span>
                  </div>

                  {/* Category Breakdown */}
                  {(() => {
                    const categoryBreakdown = selectedItems.reduce(
                      (acc, item) => {
                        acc[item.category] =
                          (acc[item.category] || 0) + item.total;
                        return acc;
                      },
                      {} as Record<string, number>
                    );

                    return Object.entries(categoryBreakdown).map(
                      ([category, total]) => (
                        <div
                          key={category}
                          className="flex justify-between text-xs text-gray-500 ml-4">
                          <span>
                            {category.charAt(0).toUpperCase() +
                              category.slice(1)}
                          </span>
                          <span>
                            {currency}
                            {total}
                          </span>
                        </div>
                      )
                    );
                  })()}
                </div>

                <hr className="border-gray-700" />

                {/* Additional Charges */}
                {(formData.repairCharges > 0 ||
                  formData.homeVisitFee > 0 ||
                  formData.laborCharges > 0) && (
                  <div className="space-y-2">
                    {formData.repairCharges > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Repair Charges</span>
                        <span>
                          {currency}
                          {formData.repairCharges}
                        </span>
                      </div>
                    )}
                    {formData.homeVisitFee > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Home Visit Fee</span>
                        <span>
                          {currency}
                          {formData.homeVisitFee}
                        </span>
                      </div>
                    )}
                    {formData.laborCharges > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Labor Charges</span>
                        <span>
                          {currency}
                          {formData.laborCharges}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Total Calculation (NO TAX) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>Items Subtotal</span>
                    <span>
                      {currency}
                      {calculateTotal()}
                    </span>
                  </div>

                  <hr className="border-gray-700" />
                  <div className="flex justify-between text-lg font-semibold text-white">
                    <span>Total Amount</span>
                    <span>
                      {currency}
                      {(
                        Number(calculateTotal()) +
                        Number(formData.repairCharges) +
                        Number(formData.homeVisitFee) +
                        Number(formData.laborCharges)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isLoading || selectedItems.length === 0}
                className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Creating Bill..." : "Create Bill"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        size="md"
        title="Bill Created Successfully!">
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className=" h-6 w-6 sm:w-8 sm:h-8  text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Bill Generated Successfully
            </h3>
            <p className="text-gray-400">
              The bill has been created and is ready for your customer.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Bill Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer:</span>
                <span className="text-white">{selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Amount:</span>
                <span className="text-white">
                  {currency}
                  {(
                    Number(calculateTotal()) +
                    Number(formData.repairCharges) +
                    Number(formData.homeVisitFee) +
                    Number(formData.laborCharges)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Items:</span>
                <span className="text-white">{selectedItems.length}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSuccessClose} className="flex-1">
              View All Bills
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessModal(false);
                setSelectedItems([]);
                setFormData({
                  customerId: "",
                  serviceType: "",
                  location: "",
                  billDate: new Date().toISOString().split("T")[0],
                  dueDate: "",
                  notes: "",
                  repairCharges: 0,
                  homeVisitFee: 0,
                  laborCharges: 0,
                });
              }}>
              Create Another Bill
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={itemSelectionModal.isOpen}
        onClose={closeItemSelectionModal}
        size="xl"
        title={`Select ${
          itemSelectionModal.selectedCategory.charAt(0).toUpperCase() +
          itemSelectionModal.selectedCategory.slice(1)
        } Items`}>
        <div className="space-y-6">
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className=" h-6 w-6 sm:w-8 sm:h-8  border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading products...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Filters */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <h4 className="font-medium text-white">Quick Filters</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setItemSelectionModal((prev) => ({
                        ...prev,
                        selectedSpecifications: {},
                      }))
                    }
                    className="text-xs text-gray-400 hover:text-white max-sm:!py-1">
                    Clear All
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
                  {/* Brand Filter */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Brand</Label>
                    <Dropdown
                      options={[
                        { value: "", label: "All Brands" },
                        ...brands.map((brand) => ({
                          value: brand.name,
                          label: brand.name,
                        })),
                      ]}
                      value={
                        itemSelectionModal.selectedSpecifications.brand || ""
                      }
                      onValueChange={(value) =>
                        setItemSelectionModal((prev) => ({
                          ...prev,
                          selectedSpecifications: {
                            ...prev.selectedSpecifications,
                            brand: value || undefined,
                          },
                        }))
                      }
                      placeholder="Select brand"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>

                  {/* Color Filter (for lights) */}
                  {itemSelectionModal.selectedCategory === "light" && (
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Color</Label>
                      <Dropdown
                        options={[
                          { value: "", label: "All Colors" },
                          { value: "white", label: "White" },
                          { value: "warm-white", label: "Warm White" },
                          { value: "cool-white", label: "Cool White" },
                          { value: "yellow", label: "Yellow" },
                          { value: "red", label: "Red" },
                          { value: "blue", label: "Blue" },
                          { value: "green", label: "Green" },
                        ]}
                        value={
                          itemSelectionModal.selectedSpecifications.color || ""
                        }
                        onValueChange={(value) =>
                          setItemSelectionModal((prev) => ({
                            ...prev,
                            selectedSpecifications: {
                              ...prev.selectedSpecifications,
                              color: value || undefined,
                            },
                          }))
                        }
                        placeholder="Select color"
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>
                  )}

                  {/* Watts Filter (for lights, motors, pumps) */}
                  {["light", "motor", "pump"].includes(
                    itemSelectionModal.selectedCategory
                  ) && (
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Watts</Label>
                      <Dropdown
                        options={[
                          { value: "", label: "All Watts" },
                          { value: "0.5", label: "0.5W" },
                          { value: "1", label: "1W" },
                          { value: "3", label: "3W" },
                          { value: "5", label: "5W" },
                          { value: "9", label: "9W" },
                          { value: "12", label: "12W" },
                          { value: "15", label: "15W" },
                          { value: "20", label: "20W" },
                          { value: "30", label: "30W" },
                          { value: "50", label: "50W" },
                          { value: "100", label: "100W" },
                          { value: "200", label: "200W" },
                          { value: "500", label: "500W" },
                          { value: "1000", label: "1000W" },
                          { value: "1500", label: "1500W" },
                          { value: "2000", label: "2000W" },
                        ]}
                        value={
                          itemSelectionModal.selectedSpecifications.watts || ""
                        }
                        onValueChange={(value) =>
                          setItemSelectionModal((prev) => ({
                            ...prev,
                            selectedSpecifications: {
                              ...prev.selectedSpecifications,
                              watts: value || undefined,
                            },
                          }))
                        }
                        placeholder="Select watts"
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>
                  )}

                  {/* Size Filter (for specific light types) */}
                  {itemSelectionModal.selectedCategory === "light" && (
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Size</Label>
                      <Dropdown
                        options={[
                          { value: "", label: "All Sizes" },
                          { value: "small", label: "Small" },
                          { value: "medium", label: "Medium" },
                          { value: "large", label: "Large" },
                          { value: "4ft", label: "4ft" },
                          { value: "6ft", label: "6ft" },
                          { value: "2x2", label: "2x2" },
                          { value: "1x4", label: "1x4" },
                        ]}
                        value={
                          itemSelectionModal.selectedSpecifications.size || ""
                        }
                        onValueChange={(value) =>
                          setItemSelectionModal((prev) => ({
                            ...prev,
                            selectedSpecifications: {
                              ...prev.selectedSpecifications,
                              size: value || undefined,
                            },
                          }))
                        }
                        placeholder="Select size"
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>
                  )}

                  {/* Wire Gauge Filter (for wires) */}
                  {itemSelectionModal.selectedCategory === "wire" && (
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">
                        Wire Gauge
                      </Label>
                      <Dropdown
                        options={[
                          { value: "", label: "All Gauges" },
                          { value: "0.5mm", label: "0.5mm" },
                          { value: "1mm", label: "1mm" },
                          { value: "1.5mm", label: "1.5mm" },
                          { value: "2.5mm", label: "2.5mm" },
                          { value: "4mm", label: "4mm" },
                          { value: "6mm", label: "6mm" },
                          { value: "10mm", label: "10mm" },
                        ]}
                        value={
                          itemSelectionModal.selectedSpecifications.wireGauge ||
                          ""
                        }
                        onValueChange={(value) =>
                          setItemSelectionModal((prev) => ({
                            ...prev,
                            selectedSpecifications: {
                              ...prev.selectedSpecifications,
                              wireGauge: value || undefined,
                            },
                          }))
                        }
                        placeholder="Select gauge"
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>
                  )}

                  {/* Ampere Filter (for MCB, switches, sockets) */}
                  {["mcb", "switch", "socket"].includes(
                    itemSelectionModal.selectedCategory
                  ) && (
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-sm">Ampere</Label>
                      <Dropdown
                        options={[
                          { value: "", label: "All Ampere" },
                          { value: "6A", label: "6A" },
                          { value: "10A", label: "10A" },
                          { value: "16A", label: "16A" },
                          { value: "20A", label: "20A" },
                          { value: "25A", label: "25A" },
                          { value: "32A", label: "32A" },
                          { value: "40A", label: "40A" },
                          { value: "63A", label: "63A" },
                        ]}
                        value={
                          itemSelectionModal.selectedSpecifications.ampere || ""
                        }
                        onValueChange={(value) =>
                          setItemSelectionModal((prev) => ({
                            ...prev,
                            selectedSpecifications: {
                              ...prev.selectedSpecifications,
                              ampere: value || undefined,
                            },
                          }))
                        }
                        placeholder="Select ampere"
                        className="bg-gray-700 border-gray-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Active Filters Display */}
              {Object.values(itemSelectionModal.selectedSpecifications).some(
                (val) => val
              ) && (
                <div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(
                      itemSelectionModal.selectedSpecifications
                    ).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <span
                          onClick={() =>
                            setItemSelectionModal((prev) => ({
                              ...prev,
                              selectedSpecifications: {
                                ...prev.selectedSpecifications,
                                [key]: undefined,
                              },
                            }))
                          }
                          key={key}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-600/30 rounded text-xs text-blue-300">
                          {key}: {value}
                          <button className="ml-1 hover:text-blue-100">
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Available Items */}
              <div className="space-y-2 sm:space-y-3 flex flex-col max-h-[300px]">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">
                    Available Items ({filterItemsBySpecifications().length})
                  </h4>
                  <div className="text-sm text-gray-400">
                    Showing filtered results
                  </div>
                </div>
                <div className="flex flex-col overflow-auto">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {filterItemsBySpecifications().map((product) => (
                      <motion.div key={product._id} whileTap={{ scale: 0.98 }}>
                        <Button
                          variant="outline"
                          onClick={() => {
                            addItemToBill(product);
                            closeItemSelectionModal();
                          }}
                          className="w-full h-auto p-4 flex flex-col items-start gap-3 bg-gray-800 border-gray-700 hover:bg-gray-700">
                          <div className="text-left w-full">
                            <div className="flex justify-between items-start md:mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-white text-sm">
                                  {getItemDisplayName(product)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {product.brand?.name || "Unknown Brand"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-blue-400 font-medium">
                                  {currency}
                                  {product.pricing.sellingPrice}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Stock: {product.inventory.currentStock}
                                </p>
                              </div>
                            </div>

                            <div className="text-xs text-gray-400 space-y-1 hidden md:block">
                              <p>{getItemSpecifications(product)}</p>
                              <p>
                                Purchase Price: {currency}
                                <span className="relative inline-block after:absolute after:inset-0 after:backdrop-blur-sm after:z-10 after:rounded-lg">
                                  &nbsp;{product.pricing.purchasePrice}
                                </span>
                              </p>
                              <p>
                                Selling Price: {currency}
                                {product.pricing.sellingPrice}
                              </p>
                              {/* <p>
                              Profit: {currency}
                              {product.pricing.sellingPrice -
                                product.pricing.purchasePrice}
                            </p> */}
                            </div>
                          </div>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {filterItemsBySpecifications().length === 0 && (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No items found matching your criteria.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Try adjusting your filters or check inventory.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={closeItemSelectionModal}
              className="flex-1">
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setItemSelectionModal((prev) => ({
                  ...prev,
                  selectedSpecifications: {},
                }))
              }
              className="flex-1">
              Clear Filters
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        onConfirm={() => setShowAlertModal(false)}
        title="Warning"
        message={alertMessage}
        type="alert"
      />
    </div>
  );
}
