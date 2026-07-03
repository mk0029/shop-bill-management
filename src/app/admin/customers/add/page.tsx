/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import {
  SuccessPopup,
  createCustomerSuccessPopup,
} from "@/components/ui/success-popup";
import { createCustomer } from "@/lib/form-service";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/store/locale-store";
import { ArrowLeft, Save, User, Phone, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";
import { locationOptions as baseLocationOptions } from "../../tools/fitting-items/constants";

const locationOptions = [...baseLocationOptions, { value: "__custom__", label: "Other (custom)" }];

const serviceTypeOptions = [
  { value: "all", label: "All" },
  { value: "shop", label: "Shop" },
  { value: "home", label: "Home" },
];

export default function AddCustomerPage() {
  const router = useRouter();
  const { t, currency } = useLocaleStore();
  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    phone: "",
    email: "",
    location: "",
    customLocation: "",
    serviceType: "All",
    address: "",
    notes: "",
    customerId: "",
    secretKey: "",
  });

  const resolvedLocation = formData.location === "__custom__" ? formData.customLocation : formData.location;

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generateCredentials = () => {
    const customerId =
      formData.customerId || `CUST${Date.now().toString().slice(-6)}`;
    const secretKey =
      formData.secretKey ||
      Math.random().toString(36).substring(2, 10).toUpperCase();
    return { customerId, secretKey };
  };

  const clearForm = () => {
    setFormData({
      name: "",
      nickname: "",
      phone: "",
      email: "",
      location: "",
      customLocation: "",
      serviceType: "",
      address: "",
      notes: "",
      customerId: "",
      secretKey: "",
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter customer name");
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error("Please enter phone number");
      return false;
    }
    const loc = formData.location === "__custom__" ? formData.customLocation : formData.location;
    if (!loc.trim()) {
      toast.error("Please enter location");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Create customer in Sanity using the actual API
      const result = await createCustomer({
        name: formData.name,
        nickname: formData.nickname.trim() || undefined,
        phone: formData.phone,
        location: resolvedLocation,
        email: formData.email || undefined,
      });

      if (result.success && result.data) {
        // Clear form after successful submission
        clearForm();

        const resetForm = () => {
          clearForm();
        };

        setSuccessData(createCustomerSuccessPopup(result.data, resetForm));
      } else {
        toast.error(result.error || "An error occurred while creating the customer.");
      }
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Add New Customer
          </h1>
        </div>
      </div>

      {/* Form */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 max-md:space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter customer's full name"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-gray-300">
                  Nickname
                </Label>
                <Input
                  id="nickname"
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => handleInputChange("nickname", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  placeholder="Preferred display name (optional)"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">
                  Used for reminders, WhatsApp messages, invoices, and throughout the application. If left blank, the customer's full name will be used.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
                  <Input
                    id="phone"
                    type="number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter phone number"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  placeholder="Enter email address (optional)"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-gray-300">
                  Location *
                </Label>
                <Dropdown
                  options={locationOptions}
                  value={formData.location}
                  onValueChange={(value) =>
                    handleInputChange("location", value)
                  }
                  placeholder="Select location"
                  className="bg-gray-800 border-gray-700"
                  disabled={isLoading}
                />
                {formData.location === "__custom__" && (
                  <div className="relative mt-2">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
                    <Input
                      id="customLocation"
                      type="text"
                      value={formData.customLocation}
                      onChange={(e) =>
                        handleInputChange("customLocation", e.target.value)
                      }
                      className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                      placeholder="Enter village / location name"
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Service Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
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
                  className="bg-gray-800 border-gray-700"
                  disabled={isLoading}
                />
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-300">
                  Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      handleInputChange("address", e.target.value)
                    }
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter full address"
                    disabled={isLoading}
                  />
                </div>
              </div> */}
            </div>

            {/* Login Credentials */}
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="customerId" className="text-gray-300">
                  Customer ID
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
                  <Input
                    id="customerId"
                    type="text"
                    value={formData.customerId}
                    onChange={(e) =>
                      handleInputChange("customerId", e.target.value)
                    }
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter custom customer ID (optional)"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Leave empty to auto-generate
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretKey" className="text-gray-300">
                  Secret Key
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
                  <Input
                    id="secretKey"
                    type="text"
                    value={formData.secretKey}
                    onChange={(e) =>
                      handleInputChange("secretKey", e.target.value)
                    }
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter custom secret key (optional)"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Leave empty to auto-generate
                </p>
              </div>
            </div> */}

            {/* Additional Information */}
            {/* <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-300">
                Notes
              </Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none   focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                placeholder="Add any additional notes about the customer..."
                disabled={isLoading}
              />
            </div> */}

            {/* Submit Button */}
            <div className="flex gap-4 pt-2 md:pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Creating Customer..." : "Create Customer"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Popup */}
      {successData && (
        <SuccessPopup
          isOpen={!!successData}
          onClose={() => setSuccessData(null)}
          data={successData}
        />
      )}
    </div>
  );
}
