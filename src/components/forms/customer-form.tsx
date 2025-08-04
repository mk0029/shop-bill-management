"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SuccessPopup,
  createCustomerSuccessPopup,
  type SuccessPopupData,
} from "@/components/ui/success-popup";
import { createCustomer } from "@/lib/form-service";
import { CreateCustomerData, Customer } from "@/types";

interface CustomerFormProps {
  onSubmit?: (data: CreateCustomerData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  customer?: Customer; // For editing existing customer
  onSuccess?: (customer: any) => void; // Callback for successful creation
}

export function CustomerForm({
  onSubmit,
  onCancel,
  loading = false,
  customer,
  onSuccess,
}: CustomerFormProps) {
  const [formData, setFormData] = useState<CreateCustomerData>({
    name: "",
    phone: "",
    location: "",
  });
  const [formErrors, setFormErrors] = useState<Partial<CreateCustomerData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessPopupData | null>(null);

  // Populate form when editing existing customer
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone,
        location: customer.location,
      });
    }
  }, [customer]);

  const validateForm = (): boolean => {
    const errors: Partial<CreateCustomerData> = {};

    if (!formData.name.trim()) {
      errors.name = "Customer name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      errors.phone = "Please enter a valid phone number";
    }

    if (!formData.location.trim()) {
      errors.location = "Location is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // If custom onSubmit is provided, use it (for editing)
      if (onSubmit) {
        await onSubmit(formData);
        return;
      }

      // Otherwise, create new customer in Sanity
      const result = await createCustomer({
        name: formData.name,
        phone: formData.phone,
        location: formData.location,
      });

      if (result.success && result.data) {
        // Show success popup with customer credentials
        const resetForm = () => {
          setFormData({ name: "", phone: "", location: "" });
        };
        
        setSuccessData(
          createCustomerSuccessPopup(result.data, resetForm)
        );
      } else {
        // Show error alert
        alert(result.error || "An error occurred while creating the customer.");
      }
    } catch (error) {
      console.error("Form submission failed:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateCustomerData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Customer Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Enter customer name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          error={formErrors.name}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Enter phone number"
          value={formData.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          error={formErrors.phone}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          type="text"
          placeholder="Enter customer location"
          value={formData.location}
          onChange={(e) => handleInputChange("location", e.target.value)}
          error={formErrors.location}
          disabled={loading}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          loading={loading || isSubmitting}
          disabled={loading || isSubmitting}
          className="flex-1"
        >
          {loading || isSubmitting
            ? "Saving..."
            : customer
            ? "Update Customer"
            : "Create Customer"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>

    {/* Success Popup */}
    {successData && (
      <SuccessPopup
        isOpen={!!successData}
        onClose={() => setSuccessData(null)}
        data={successData}
      />
    )}
  </>
  );
}
