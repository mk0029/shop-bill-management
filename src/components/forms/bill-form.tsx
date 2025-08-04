"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Dropdown } from "@/components/ui/dropdown";
import { useLocaleStore } from "@/store/locale-store";
import {
  Plus,
  Minus,
  Trash2,
  Calculator,
  User,
  MapPin,
  FileText,
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
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface BillFormData {
  customerId: string;
  serviceType: string;
  locationType: string;
  items: BillItem[];
  notes: string;
}

interface BillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (billData: BillFormData) => Promise<void>;
  customers: Customer[];
  items: Item[];
  isLoading?: boolean;
}

const serviceTypeOptions = [
  { value: "sale", label: "Sale" },
  { value: "repair", label: "Repair" },
  { value: "custom", label: "Custom" },
];

const locationTypeOptions = [
  { value: "shop", label: "Shop" },
  { value: "home", label: "Home" },
];

export function BillForm({
  isOpen,
  onClose,
  onSubmit,
  customers,
  items,
  isLoading = false,
}: BillFormProps) {
  const { currency } = useLocaleStore();
  const [formData, setFormData] = useState<BillFormData>({
    customerId: "",
    serviceType: "sale",
    locationType: "shop",
    items: [],
    notes: "",
  });

  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  const addItemToBill = (item: Item) => {
    const existingItem = formData.items.find((i) => i.id === item.id);
    if (existingItem) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price } : i
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { 
          id: item.id, 
          name: item.name, 
          quantity: 1, 
          price: item.price, 
          total: item.price 
        }]
      }));
    }
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((i) => 
          i.id === itemId ? { ...i, quantity, total: quantity * i.price } : i
        )
      }));
    }
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.total, 0);
    const homeVisitFee = formData.locationType === "home" ? 500 : 0;
    const total = subtotal + homeVisitFee;
    return { subtotal, homeVisitFee, total };
  };

  const handleSubmit = async () => {
    if (!formData.customerId || formData.items.length === 0) return;
    await onSubmit(formData);
    // Reset form
    setFormData({
      customerId: "",
      serviceType: "sale",
      locationType: "shop",
      items: [],
      notes: "",
    });
    onClose();
  };

  const { subtotal, homeVisitFee, total } = calculateTotals();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Bill"
      size="xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Bill Details */}
        <div className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Customer
            </label>
            <Dropdown
              options={customers.map(c => ({ 
                value: c.id, 
                label: `${c.name} - ${c.phone}` 
              }))}
              value={formData.customerId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}
              placeholder="Select Customer"
            />
            {selectedCustomer && (
              <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <User className="w-4 h-4" />
                  {selectedCustomer.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <MapPin className="w-4 h-4" />
                  {selectedCustomer.location}
                </div>
              </div>
            )}
          </div>

          {/* Service Type and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Service Type
              </label>
              <Dropdown
                options={serviceTypeOptions}
                value={formData.serviceType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}
                placeholder="Select Service Type"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Location
              </label>
              <Dropdown
                options={locationTypeOptions}
                value={formData.locationType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, locationType: value }))}
                placeholder="Select Location"
              />
            </div>
          </div>

          {/* Available Items */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add Items
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 border border-gray-700"
                  onClick={() => addItemToBill(item)}
                >
                  <div>
                    <p className="text-white text-sm">{item.name}</p>
                    <p className="text-gray-400 text-xs">{item.category}</p>
                  </div>
                  <p className="text-white font-medium">
                    {currency}{item.price}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 resize-none"
              rows={3}
              placeholder="Add any notes about the service..."
            />
          </div>
        </div>

        {/* Right Column - Selected Items & Total */}
        <div className="space-y-6">
          {/* Selected Items */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Selected Items
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {formData.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700"
                >
                  <div className="flex-1">
                    <p className="text-white text-sm">{item.name}</p>
                    <p className="text-gray-400 text-xs">
                      {currency}{item.price} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                      className="hover:bg-gray-700"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-white w-8 text-center">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      className="hover:bg-gray-700"
                    >
                      +
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="hover:bg-red-900/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-white font-medium w-20 text-right">
                    {currency}{item.total.toLocaleString()}
                  </p>
                </div>
              ))}
              {formData.items.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No items selected</p>
                  <p className="text-sm">Click on items from the left to add them</p>
                </div>
              )}
            </div>
          </div>

          {/* Bill Summary */}
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Bill Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Subtotal</span>
                <span>{currency}{subtotal.toLocaleString()}</span>
              </div>
              {formData.locationType === "home" && (
                <div className="flex justify-between text-gray-300">
                  <span>Home Visit Fee</span>
                  <span>{currency}500</span>
                </div>
              )}
              <div className="border-t border-gray-700 pt-2">
                <div className="flex justify-between text-white font-bold text-lg">
                  <span>Total</span>
                  <span>{currency}{total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!formData.customerId || formData.items.length === 0 || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Bill...
                </div>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bill
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
} 