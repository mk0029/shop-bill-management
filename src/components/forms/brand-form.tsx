"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBrandStore } from "@/store/brand-store";
import { Brand } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";

interface BrandFormProps {
  brand?: Brand; // For editing existing brand
  onSuccess?: (brand: Brand) => void;
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

  // Populate form when editing existing brand
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

    // Prevent double submission
    if (isSubmitting || isLoading) {
      console.log("🚫 Preventing duplicate submission");
      return;
    }

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
        // Update existing brand
        success = await updateBrand(brand._id, brandData);
      } else {
        // Create new brand
        console.log("🏷️ Creating brand:", brandData.name);
        success = await addBrand(brandData);
      }

      if (success) {
        clearForm();
        if (onSuccess) {
          // Get the updated/created brand from the store
          const updatedBrand = brand
            ? useBrandStore.getState().getBrandById(brand._id)
            : useBrandStore.getState().brands[
                useBrandStore.getState().brands.length - 1
              ];

          if (updatedBrand) {
            onSuccess(updatedBrand);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error in brand submission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-gray-300">
            Brand Name *
          </Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            placeholder="Enter brand name"
            error={formErrors.name}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-300">
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            placeholder="Enter brand description"
            rows={3}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white">Contact Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              placeholder="Enter email address"
              error={formErrors.email}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-gray-300">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
              placeholder="Enter phone number"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website" className="text-gray-300">
            Website
          </Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleInputChange("website", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            placeholder="Enter website URL (e.g., https://example.com)"
            error={formErrors.website}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-gray-300">
            Address
          </Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            placeholder="Enter address"
            rows={2}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              handleInputChange("isActive", checked as boolean)
            }
            disabled={isLoading}
          />
          <Label htmlFor="isActive" className="text-gray-300">
            Active Brand
          </Label>
        </div>
        <p className="text-sm text-gray-400">
          Inactive brands will not appear in product selection
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-500 rounded-md">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          loading={isLoading || isSubmitting}
          disabled={isLoading || isSubmitting}
          className="flex-1">
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
          disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
