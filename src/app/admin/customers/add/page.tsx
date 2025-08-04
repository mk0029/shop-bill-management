"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/store/locale-store";
import { ArrowLeft, Save, User, Phone, MapPin, Building2 } from "lucide-react";

const locationOptions = [
  { value: "new-york", label: "New York" },
  { value: "los-angeles", label: "Los Angeles" },
  { value: "chicago", label: "Chicago" },
  { value: "houston", label: "Houston" },
  { value: "phoenix", label: "Phoenix" },
  { value: "philadelphia", label: "Philadelphia" },
  { value: "san-antonio", label: "San Antonio" },
  { value: "san-diego", label: "San Diego" },
  { value: "dallas", label: "Dallas" },
  { value: "san-jose", label: "San Jose" },
];

const serviceTypeOptions = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "emergency", label: "Emergency" },
  { value: "maintenance", label: "Maintenance" },
];

export default function AddCustomerPage() {
  const router = useRouter();
  const { t, currency } = useLocaleStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    customerId: string;
    secretKey: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
    serviceType: "",
    address: "",
    notes: "",
    customerId: "",
    secretKey: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateCredentials = () => {
    const customerId = formData.customerId || `CUST${Date.now().toString().slice(-6)}`;
    const secretKey = formData.secretKey || Math.random().toString(36).substring(2, 10).toUpperCase();
    return { customerId, secretKey };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const credentials = generateCredentials();
      setGeneratedCredentials(credentials);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Error adding customer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setGeneratedCredentials(null);
    router.push("/admin/customers");
  };

  return (
    <div className="space-y-6">
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
          <h1 className="text-3xl font-bold text-white">Add New Customer</h1>
          <p className="text-gray-400 mt-1">
            Create a new customer account with login credentials
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter customer's full name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter phone number"
                    required
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-gray-300">
                  Location *
                </Label>
                <Dropdown
                  options={locationOptions}
                  value={formData.location}
                  onValueChange={(value) => handleInputChange("location", value)}
                  placeholder="Select location"
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            {/* Service Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="serviceType" className="text-gray-300">
                  Service Type *
                </Label>
                <Dropdown
                  options={serviceTypeOptions}
                  value={formData.serviceType}
                  onValueChange={(value) => handleInputChange("serviceType", value)}
                  placeholder="Select service type"
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-300">
                  Address
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter full address"
                  />
                </div>
              </div>
            </div>

            {/* Login Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customerId" className="text-gray-300">
                  Customer ID
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="customerId"
                    type="text"
                    value={formData.customerId}
                    onChange={(e) => handleInputChange("customerId", e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter custom customer ID (optional)"
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
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="secretKey"
                    type="text"
                    value={formData.secretKey}
                    onChange={(e) => handleInputChange("secretKey", e.target.value)}
                    className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    placeholder="Enter custom secret key (optional)"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Leave empty to auto-generate
                </p>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-300">
                Notes
              </Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any additional notes about the customer..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
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
        title="Customer Created Successfully!"
      >
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Customer Account Created
            </h3>
            <p className="text-gray-400">
              The customer has been successfully added to your system.
            </p>
          </div>

          {generatedCredentials && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white">Login Credentials</h4>
              <div className="space-y-2">
                <div>
                  <Label className="text-gray-400 text-sm">Customer ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={generatedCredentials.customerId}
                      readOnly
                      className="bg-gray-700 border-gray-600 text-white font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(generatedCredentials.customerId)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Secret Key</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={generatedCredentials.secretKey}
                      readOnly
                      className="bg-gray-700 border-gray-600 text-white font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(generatedCredentials.secretKey)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-yellow-400 text-sm">
                ⚠️ Please save these credentials securely. They won&apos;t be shown again.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleSuccessClose} className="flex-1">
              View All Customers
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessModal(false);
                setGeneratedCredentials(null);
                              setFormData({
                name: "",
                phone: "",
                email: "",
                location: "",
                serviceType: "",
                address: "",
                notes: "",
                customerId: "",
                secretKey: "",
              });
              }}
            >
              Add Another Customer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 