"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Save, 
  MessageCircle, 
  Phone, 
  Building2, 
  Mail, 
  Globe,
  CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  getWhatsAppConfig, 
  updateWhatsAppConfig, 
  WhatsAppConfig 
} from "@/lib/whatsapp-utils";

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [config, setConfig] = useState<WhatsAppConfig>(getWhatsAppConfig());

  const handleInputChange = (field: keyof WhatsAppConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateWhatsAppConfig(config);
      setShowSuccess(true);
      
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving WhatsApp config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            WhatsApp Configuration
          </h1>
          <p className="text-gray-400 mt-1">
            Configure your business details for WhatsApp bill sharing
          </p>
        </div>
      </div>

      {/* Configuration Form */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-gray-300">
                WhatsApp Phone Number *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={config.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  placeholder="+91 7015493276"
                  required
                />
              </div>
              <p className="text-xs text-gray-400">
                Include country code (e.g., +91 for India)
              </p>
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-gray-300">
                Business Name *
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="businessName"
                  type="text"
                  value={config.businessName}
                  onChange={(e) =>
                    handleInputChange("businessName", e.target.value)
                  }
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  placeholder="Your Business Name"
                  required
                />
              </div>
            </div>

            {/* Business Address */}
            <div className="space-y-2">
              <Label htmlFor="businessAddress" className="text-gray-300">
                Business Address *
              </Label>
              <Textarea
                id="businessAddress"
                value={config.businessAddress}
                onChange={(e) =>
                  handleInputChange("businessAddress", e.target.value)
                }
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                placeholder="Enter your complete business address"
                rows={3}
                required
              />
            </div>

            {/* Business Email */}
            <div className="space-y-2">
              <Label htmlFor="businessEmail" className="text-gray-300">
                Business Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="businessEmail"
                  type="email"
                  value={config.businessEmail || ""}
                  onChange={(e) =>
                    handleInputChange("businessEmail", e.target.value)
                  }
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  placeholder="business@example.com"
                />
              </div>
            </div>

            {/* Business Website */}
            <div className="space-y-2">
              <Label htmlFor="businessWebsite" className="text-gray-300">
                Business Website
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="businessWebsite"
                  type="url"
                  value={config.businessWebsite || ""}
                  onChange={(e) =>
                    handleInputChange("businessWebsite", e.target.value)
                  }
                  className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  placeholder="www.yourbusiness.com"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label className="text-gray-300">Message Preview</Label>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-300 space-y-1">
                  <p>
                    <strong>*{config.businessName}*</strong>
                  </p>
                  <p>
                    <strong>*Bill #BILL-001*</strong>
                  </p>
                  <br />
                  <p>
                    <strong>*Customer Details:*</strong>
                  </p>
                  <p>Name: John Doe</p>
                  <p>Phone: +91 7015493276</p>
                  <br />
                  <p>
                    <strong>*Bill Details:*</strong>
                  </p>
                  <p>Date: 2025-01-15</p>
                  <p>Due Date: 2025-01-30</p>
                  <br />
                  <p>
                    <strong>*Items:*</strong>
                  </p>
                  <p>• LED Bulb x5 = ₹450</p>
                  <p>• Wire x10 = ₹1500</p>
                  <br />
                  <p>
                    <strong>*Summary:*</strong>
                  </p>
                  <p>Subtotal: ₹1950</p>
                  <p>
                    <strong>*Total: ₹1950*</strong>
                  </p>
                  <br />
                  <p>
                    <strong>*Contact:*</strong>
                  </p>
                  <p>{config.businessName}</p>
                  <p>{config.businessAddress}</p>
                  {config.businessEmail && <p>Email: {config.businessEmail}</p>}
                  {config.businessWebsite && (
                    <p>Website: {config.businessWebsite}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-2 md:pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {isLoading ? "Saving..." : "Save Configuration"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <CheckCircle className="w-5 h-5" />
          <span>Configuration saved successfully!</span>
        </div>
      )}
    </div>
  );
} 