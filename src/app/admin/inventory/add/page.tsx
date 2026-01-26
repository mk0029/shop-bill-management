/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { SuccessPopup } from "@/components/ui/success-popup";
import { ConfirmationPopup } from "@/components/ui/confirmation-popup";
import { DynamicSpecificationFields } from "@/components/forms/dynamic-specification-fields";
import { useMultipleInventoryForm } from "@/hooks/use-multiple-inventory-form";
import type { InventoryFormData } from "@/hooks/use-multiple-inventory-form";
import { BasicInfoSection } from "@/components/inventory/basic-info-section";
import { PricingSection } from "@/components/inventory/pricing-section";
import { StaticInfoSection } from "@/components/inventory/static-info-section";
import { ResponsiveAccordion } from "@/components/ui/responsive-accordion";

export default function BulkAddInventoryPage() {
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

  // Track which accordion item is open; only one at a time
  const [openId, setOpenId] = useState<string | null>(null);

  // Helpers for normalization and matching
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

  // Filtered suggestions per form based on current input (lowercase partial match)
  const filteredProductsByForm = useMemo(() => {
    const map: Record<string, typeof products> = {};
    for (const form of formDataList) {
      const query = normalize(form.productName || "");
      map[form.id] = query
        ? products.filter(
            (p) => p.isActive && normalize(p.name).includes(query),
          )
        : products.filter((p) => p.isActive);
    }
    return map;
  }, [formDataList, products]);

  // Wrapped input change: keep user's casing/spaces, but match using normalized value
  const handleNormalizedInputChange = (
    formId: string,
    field: string,
    value: string,
  ) => {
    if (field === "productName") {
      // Keep what user typed (do not force lowercase or trim)
      handleInputChange(formId, field, value);

      const normalizedValue = normalize(value);

      // Exact match -> auto-select existing item and populate
      const exact = products.find(
        (p) => normalize(p.name) === normalizedValue && p.isActive,
      );
      if (exact) {
        handleExistingProductSelect(formId, exact._id);
        return;
      }

      // No exact match -> only clear the selection flag, keep typed name intact
      handleInputChange(formId, "selectedExistingProduct", "");
      return;
    }

    // Non-name fields pass through
    handleInputChange(formId, field, value);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    // Ensure duplicates are prevented just before submit by auto-selecting matches
    for (const form of formDataList) {
      const normalized = normalize(form.productName || "");
      if (!normalized) continue;
      const exact = products.find(
        (p) => p.isActive && normalize(p.name) === normalized,
      );
      if (exact && form.selectedExistingProduct !== exact._id) {
        handleExistingProductSelect(form.id, exact._id);
      }
    }
    // Proceed with existing submit flow
    handleSubmit(e);
  };

  return (
    <div className="space-y-6 max-md:space-y-4 max-md:pb-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Add Products
          </h1>
        </div>
      </div>

      <form onSubmit={onFormSubmit} className="space-y-6 max-md:space-y-4">
        {formDataList.map((formData: InventoryFormData, index) => (
          <div key={formData.id} id={`product_${index + 1}`}>
            {" "}
            <ResponsiveAccordion
              className="relative"
              title={formData.productName || `Product #${index + 1}`}
              headerRight={
                formDataList.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeForm(formData.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : null
              }
              open={openId ? openId === formData.id : index === 0}
              onOpenChange={(next) => setOpenId(next ? formData.id : null)}
              desktopCollapsible
            >
              {/* Product number indicator */}
              {/* <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">
                Product #{index + 1}
              </h3>
              <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                <div
                  className="bg-slate-400 h-0.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${((index + 1) / formDataList.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div> */}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                {/* Left Column: Basic Information and Specifications */}
                <div className="space-y-6 max-md:space-y-4">
                  <BasicInfoSection
                    formData={formData as any}
                    categories={categories}
                    brands={brands}
                    products={filteredProductsByForm[formData.id] || products}
                    errors={errors[formData.id] || {}}
                    onInputChange={(field, value) =>
                      handleNormalizedInputChange(formData.id, field, value)
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
                    formData={formData as any}
                    errors={errors[formData.id] || {}}
                    onInputChange={(field, value) =>
                      handleInputChange(formData.id, field, value)
                    }
                  />

                  <StaticInfoSection
                    formData={formData as any}
                    errors={errors[formData.id] || {}}
                    onInputChange={(field, value) =>
                      handleInputChange(formData.id, field, value)
                    }
                    isExistingProductSelected={
                      !!formData.selectedExistingProduct
                    }
                  />
                </div>
              </div>
            </ResponsiveAccordion>
          </div>
        ))}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const id = addNewForm();
                setOpenId(id);
                // Scroll to the newly added section
                setTimeout(() => {
                  const el = document.getElementById(
                    `product_${formDataList.length}`,
                  );
                  if (el) {
                    el.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }, 10);
              }}
              className="flex items-center gap-2 w-full"
            >
              <Plus className="w-4 h-4" />
              Add More Product
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={isLoading || formDataList.length === 0}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding {formDataList.length} Products...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <Save className="w-4 h-4" />
                  Add {formDataList.length} Product
                  {formDataList.length !== 1 ? "s" : ""}
                </div>
              )}
            </Button>
          </div>

          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              resetForms();
              setOpenId(null);
            }}
            disabled={isLoading}
          >
            Reset All
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
            message: `${successfulProducts.length} products have been added to your inventory`,
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
            title: "Add Multiple Products",
            message: isLoading
              ? `Adding ${formDataList.length} products... (${progress.current}/${progress.total} completed)`
              : `Are you sure you want to add ${formDataList.length} products to your inventory?`,
            type: "info",
            actions: [
              {
                label: isLoading
                  ? `Adding... (${progress.current}/${progress.total})`
                  : `Add ${formDataList.length} Products`,
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
