"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import {
  SuccessPopup,
  createProductSuccessPopup,
} from "@/components/ui/success-popup";
import { ConfirmationPopup } from "@/components/ui/confirmation-popup";
import { DynamicSpecificationFields } from "@/components/forms/dynamic-specification-fields";
import { useInventoryForm } from "@/hooks/use-inventory-form";
import { BasicInfoSection } from "@/components/inventory/basic-info-section";
import { PricingSection } from "@/components/inventory/pricing-section";

export default function AddInventoryItemPage() {
  const router = useRouter();
  const {
    formData,
    errors,
    isLoading,
    showSuccessPopup,
    showConfirmationPopup,
    brands,
    categories,
    specifications,
    handleInputChange,
    handleSpecificationChange,
    handleSubmit,
    confirmSubmit,
    resetForm,
    handleSuccessClose,
    setShowConfirmationPopup,
    generateProductName,
  } = useInventoryForm();

  return (
    <div className="space-y-6 max-md:pb-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Add New Product
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Add a new product to your inventory
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <BasicInfoSection
            formData={formData}
            categories={categories}
            brands={brands}
            errors={errors}
            onInputChange={handleInputChange}
            dynamicSpecificationFields={
              <div className="lg:col-span-2">
                <DynamicSpecificationFields
                  categoryId={formData.category}
                  formData={formData.specifications}
                  onFieldChange={handleSpecificationChange}
                  errors={errors}
                />
              </div>
            }
          />

          {/* Pricing Information */}
          <PricingSection
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={isLoading}>
            Reset Form
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding Product...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Add Product
              </div>
            )}
          </Button>
        </div>
      </form>

      {/* Success Popup */}
      {showSuccessPopup && (
        <SuccessPopup
          isOpen={showSuccessPopup}
          onClose={handleSuccessClose}
          data={createProductSuccessPopup(
            {
              name: generateProductName(),
              category: formData.category,
              brand: formData.brand,
              currentStock: formData.currentStock,
              sellingPrice: formData.sellingPrice,
              unit: formData.unit,
            },
            () => {
              resetForm();
              handleSuccessClose();
            }
          )}
        />
      )}

      {/* Confirmation Popup */}
      {showConfirmationPopup && (
        <ConfirmationPopup
          isOpen={showConfirmationPopup}
          onClose={() => setShowConfirmationPopup(false)}
          data={{
            title: "Add Product",
            message: `Are you sure you want to add "${generateProductName()}" to inventory?`,
            type: "info",
            actions: [
              {
                label: isLoading ? "Adding..." : "Add Product",
                action: confirmSubmit,
                variant: "default",
                disabled: isLoading,
              },
              {
                label: "Cancel",
                action: () => setShowConfirmationPopup(false),
                variant: "outline",
              },
            ],
          }}
        />
      )}
    </div>
  );
}