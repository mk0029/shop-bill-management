"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBrandStore } from "@/store/brand-store";
import { Brand } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Mail, Phone, Globe, MapPin, AlertCircle } from "lucide-react";

interface BrandFormProps {
  brand?: Brand;
  onSuccess?: (brand?: Brand) => void;
  onCancel: () => void;
}

export function BrandForm({ brand, onSuccess, onCancel }: BrandFormProps) {
  const { addBrand, updateBrand, isLoading, error, clearError } =
    useBrandStore();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    isActive: true,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
        description: brand.description || "",
        email: brand.contactInfo?.email || "",
        phone: brand.contactInfo?.phone || "",
        website: brand.contactInfo?.website || "",
        address: brand.contactInfo?.address || "",
        isActive: brand.isActive,
      });
    }
  }, [brand]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Brand name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Brand name must be at least 2 characters";
    } else if (formData.name.trim().length > 100) {
      errors.name = "Brand name must be less than 100 characters";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      errors.website =
        "Please enter a valid website URL (include http:// or https://)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearForm = () => {
    setFormData({
      name: "",
      description: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      isActive: true,
    });
    setFormErrors({});
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isLoading) return;

    setIsSubmitting(true);
    clearError();

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    const brandData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      contactInfo: {
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
        address: formData.address.trim() || undefined,
      },
      isActive: formData.isActive,
    };

    let success = false;

    try {
      if (brand) {
        success = await updateBrand(brand._id, brandData);
      } else {
        success = await addBrand(brandData);
      }

      if (success) {
        clearForm();
        const updatedBrand = brand
          ? useBrandStore.getState().getBrandById(brand._id)
          : useBrandStore.getState().brands[
              useBrandStore.getState().brands.length - 1
            ];
        onSuccess?.(updatedBrand ?? brand);
      }
    } catch (error) {
      console.error("Error in brand submission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const inputClass =
    "bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500 focus:border-cyan-200/35 focus:ring-2 focus:ring-cyan-300/20 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-md:space-y-4">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-white/[0.06]">
          <Building2 className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
            Basic Information
          </h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-gray-300 text-sm font-medium">
            Brand Name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className={inputClass}
            placeholder="Enter brand name"
            error={formErrors.name}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-300 text-sm font-medium">
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className={inputClass}
            placeholder="Enter brand description"
            rows={3}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-white/[0.06]">
          <Mail className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
            Contact Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300 text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={inputClass}
              placeholder="Enter email address"
              error={formErrors.email}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-300 text-sm font-medium">
              Phone
            </Label>
            <Input
              id="phone"
              type="number"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className={inputClass}
              placeholder="Enter phone number"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website" className="text-gray-300 text-sm font-medium">
            Website
          </Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleInputChange("website", e.target.value)}
            className={inputClass}
            placeholder="https://example.com"
            error={formErrors.website}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-gray-300 text-sm font-medium">
            Address
          </Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            className={inputClass}
            placeholder="Enter address"
            rows={2}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-1 border-b border-white/[0.06]">
          <AlertCircle className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
            Status
          </h3>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              handleInputChange("isActive", checked as boolean)
            }
            disabled={isLoading}
          />
          <div>
            <Label htmlFor="isActive" className="text-gray-200 text-sm font-medium cursor-pointer">
              Active Brand
            </Label>
            <p className="text-xs text-gray-500 mt-0.5">
              Inactive brands will not appear in product selection
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
        <Button
          type="submit"
          loading={isLoading || isSubmitting}
          disabled={isLoading || isSubmitting}
          className="flex-1 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20"
        >
          {isLoading || isSubmitting
            ? "Saving..."
            : brand
            ? "Update Brand"
            : "Create Brand"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
