"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import {
  SuccessPopup,
  createProductSuccessPopup,
} from "@/components/ui/success-popup";
import { ConfirmationPopup } from "@/components/ui/confirmation-popup";
import { DynamicSpecificationFields } from "@/components/forms/dynamic-specification-fields";
import { useMultipleInventoryForm } from "@/hooks/use-multiple-inventory-form";
import { BasicInfoSection } from "@/components/inventory/basic-info-section";
import { PricingSection } from "@/components/inventory/pricing-section";
import { StaticInfoSection } from "@/components/inventory/static-info-section";
import { Card } from "@/components/ui/card";

export default function AddInventoryItemPage() {
  const router = useRouter();
  const {
    formDataList,
    errors,
    isLoading,
    progress,
    showSuccessPopup,
    showConfirmationPopup,
    brands,
    categories,
    specifications,
    products,
    successfulProducts,
    handleInputChange,
    handleSpecificationChange,
    handleExistingProductSelect,
    handleSubmit,
    confirmSubmit,
    resetForms,
    handleSuccessClose,
    setShowConfirmationPopup,
    generateProductName,
    addNewForm,
    removeForm,
  } = useMultipleInventoryForm();

  return (
    <div className="space-y-6 max-md:space-y-4 max-md:pb-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Add New Product
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
            Add a new product to your inventory
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-md:space-y-4">
        {formDataList.map((formData, index) => (
          <Card key={formData.id} className="p-6 relative">
            {/* Form number indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-4">
              <span className="text-sm text-gray-400">
                Product {index + 1} of {formDataList.length}
              </span>
              {formDataList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeForm(formData.id)}
                  className="text-red-500 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Left Column: Basic Information and Specifications */}
              <div className="space-y-6 max-md:space-y-4">
                <BasicInfoSection
                  formData={formData}
                  categories={categories}
                  brands={brands}
                  products={products}
                  errors={errors[formData.id] || {}}
                  onInputChange={(field, value) =>
                    handleInputChange(formData.id, field, value)
                  }
                  onExistingProductSelect={(productId) =>
                    handleExistingProductSelect(formData.id, productId)
                  }
                  onSpecificationChange={(field, value) =>
                    handleSpecificationChange(formData.id, field, value)
                  }
                  dynamicSpecificationFields={
                    <div>
                      <DynamicSpecificationFields
                        categoryId={formData.category}
                        formData={
                          formData.specifications as Record<string, string>
                        }
                        onFieldChange={(field, value) =>
                          handleSpecificationChange(formData.id, field, value)
                        }
                        errors={errors[formData.id] || {}}
                        disabled={!!formData.selectedExistingProduct}
                      />
                    </div>
                  }
                />
              </div>

              {/* Right Column: Pricing and Static Information */}
              <div className="space-y-6 max-md:space-y-4">
                <PricingSection
                  formData={formData}
                  errors={errors[formData.id] || {}}
                  onInputChange={(field, value) =>
                    handleInputChange(formData.id, field, value)
                  }
                />

                <StaticInfoSection
                  formData={formData}
                  errors={errors[formData.id] || {}}
                  onInputChange={(field, value) =>
                    handleInputChange(formData.id, field, value)
                  }
                  isExistingProductSelected={!!formData.selectedExistingProduct}
                />
              </div>
            </div>
          </Card>
        ))}

        {/* Add New Form Button */}
        <Button
          type="button"
          variant="outline"
          onClick={addNewForm}
          className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Another Product
        </Button>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={resetForms}
            disabled={isLoading}>
            Reset All
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Adding Products...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Add {formDataList.length}{" "}
                {formDataList.length === 1 ? "Product" : "Products"}
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
          data={{
            title: "Products Added Successfully",
            message: `${successfulProducts.length} products have been added to your inventory:\n${successfulProducts.join("\n")}`,
            type: "product",
            actions: [
              {
                label: "View Inventory",
                action: handleSuccessClose,
                variant: "default",
              },
              {
                label: "Add More Products",
                action: () => {
                  handleSuccessClose();
                  resetForms();
                },
                variant: "outline",
              },
            ],
          }}
        />
      )}

      {/* Confirmation Popup */}
      {showConfirmationPopup && (
        <ConfirmationPopup
          isOpen={showConfirmationPopup}
          onClose={() => setShowConfirmationPopup(false)}
          data={{
            title: "Add Products",
            message: isLoading
              ? `Adding ${progress.current}/${progress.total} ${progress.total === 1 ? "product" : "products"}...${
                  progress.lastName ? `\nLast processed: ${progress.lastName}` : ""
                }`
              : `Are you sure you want to add ${formDataList.length} ${
                  formDataList.length === 1 ? "product" : "products"
                } to your inventory?`,
            type: "info",
            actions: [
              {
                label: isLoading
                  ? `Adding ${progress.current}/${progress.total}`
                  : "Add Products",
                action: confirmSubmit,
                variant: "default",
                disabled: isLoading,
                loading: isLoading,
              },
              {
                label: "Cancel",
                action: () => setShowConfirmationPopup(false),
                variant: "outline",
                disabled: isLoading,
              },
            ],
          }}
        />
      )}
    </div>
  );
}
