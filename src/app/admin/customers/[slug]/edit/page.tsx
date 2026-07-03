"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useRouter, useParams } from "next/navigation";
import { useCustomers } from "@/hooks/use-sanity-data";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  MapPin,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { locationOptions as baseLocationOptions } from "../../../tools/fitting-items/constants";
import { getAdminCustomerDisplayName } from "@/lib/customer-utils";

const locationOptions = [
  ...baseLocationOptions,
  { value: "__custom__", label: "Other (custom)" },
];

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const slug = (params as { slug?: string })?.slug as string;

  const { customers, updateUser, isLoading: customersLoading } = useCustomers();

  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    phone: "",
    email: "",
    location: "",
    customLocation: "",
  });

  const customer = customers.find(
    (c) => c._id === slug || c.customerId === slug,
  );

  useEffect(() => {
    if (!customer && !customersLoading) {
      setCustomerNotFound(true);
    }
  }, [customer, customersLoading]);

  useEffect(() => {
    if (customer) {
      const isCustomLocation =
        customer.location &&
        !baseLocationOptions.some((opt) => opt.value === customer.location);

      setFormData({
        name: customer.name || "",
        nickname: customer.nickname || "",
        phone: customer.phone || "",
        email: (customer as any).email || "",
        location: isCustomLocation ? "__custom__" : customer.location || "",
        customLocation: isCustomLocation ? customer.location : "",
      });
    }
  }, [customer]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resolvedLocation =
    formData.location === "__custom__" ? formData.customLocation : formData.location;

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Please enter customer name");
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error("Please enter phone number");
      return false;
    }
    if (!resolvedLocation.trim()) {
      toast.error("Please enter location");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !customer?._id) return;

    setIsLoading(true);
    try {
      await updateUser(customer._id, {
        name: formData.name.trim(),
        nickname: formData.nickname.trim() || undefined,
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        location: resolvedLocation.trim(),
      } as any);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.push("/admin/customers");
  };

  if (customersLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-white">
        Loading...
      </div>
    );
  }

  if (customerNotFound || !customer) {
    return (
      <div className="space-y-6 max-md:space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold !leading-[125%] text-white mb-2">
              Customer Not Found
            </h2>
            <p className="text-gray-400 mb-6">
              The customer you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Button onClick={() => router.push("/admin/customers")}>
              Go to Customers
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-md:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Edit Customer
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            {getAdminCustomerDisplayName(customer)} • {customer.customerId}
          </p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              {/* Name */}
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
              {/* Phone */}
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

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-[1]" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter email address (optional)"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Location */}
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

            {/* Read-only info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="text-gray-300">Customer ID</Label>
                <Input
                  value={customer.customerId || "—"}
                  className="bg-gray-800/50 border-gray-700/50 text-gray-400"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Input
                  value={customer.isActive ? "Active" : "Inactive"}
                  className={`bg-gray-800/50 border-gray-700/50 ${
                    customer.isActive ? "text-green-400" : "text-red-400"
                  }`}
                  disabled
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-2 md:pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "Saving Changes..." : "Save Changes"}
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

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        size="md"
        title="Customer Updated Successfully!"
      >
        <div className="space-y-6 max-md:space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-6 w-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Customer Updated
            </h3>
            <p className="text-gray-400">
              {formData.name}&apos;s information has been updated successfully.
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">Updated Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Phone:</span>
                <span className="text-white">{formData.phone}</span>
              </div>
              {formData.email && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white">{formData.email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Location:</span>
                <span className="text-white">{resolvedLocation}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSuccessClose} className="flex-1">
              Back to Customers
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessModal(false);
                router.push(`/admin/customers/${slug}/bills`);
              }}
            >
              View Bills
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
