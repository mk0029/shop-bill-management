/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMultipleInventoryForm } from "@/hooks/use-multiple-inventory-form";
import type { InventoryFormData } from "@/hooks/use-multiple-inventory-form";
import { PageHeader } from "@/components/inventory/add-products/page-header";
import { ProductCard } from "@/components/inventory/add-products/product-card";
import { ProductWizardModal } from "@/components/inventory/add-products/product-wizard-modal";
import { SaveConfirmModal } from "@/components/inventory/add-products/save-confirm-modal";
import { SuccessModal } from "@/components/inventory/add-products/success-modal";

const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

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
    editingFormId,
    handleInputChange,
    handleImagesChange,
    handleSpecificationChange,
    handleExistingProductSelect,
    handleSubmit,
    confirmSubmit,
    resetForms,
    handleSuccessClose,
    setShowConfirmationPopup,
    addNewForm,
    removeForm,
    duplicateForm,
    openEditor,
    closeEditor,
    saveCurrentProduct,
    saveAndAddNew,
  } = useMultipleInventoryForm();

  const editingForm = useMemo(
    () => formDataList.find((f) => f.id === editingFormId) || null,
    [formDataList, editingFormId]
  );

  const editingErrors = editingFormId ? errors[editingFormId] || {} : {};

  const filteredProductsByForm = useMemo(() => {
    const map: Record<string, typeof products> = {};
    for (const form of formDataList) {
      const query = normalize(form.productName || "");
      map[form.id] = query
        ? products.filter((p) => p.isActive && normalize(p.name).includes(query))
        : products.filter((p) => p.isActive);
    }
    return map;
  }, [formDataList, products]);

  const handleNormalizedInputChange = useCallback(
    (formId: string, field: string, value: string) => {
      if (field === "productName") {
        handleInputChange(formId, field, value);
        const normalizedValue = normalize(value);
        const exact = products.find(
          (p) => normalize(p.name) === normalizedValue && p.isActive
        );
        if (exact) {
          handleExistingProductSelect(formId, exact._id);
          return;
        }
        handleInputChange(formId, "_selectedExistingProduct", "");
        return;
      }
      if (field.startsWith("_error_")) return;
      handleInputChange(formId, field, value);
    },
    [handleInputChange, handleExistingProductSelect, products]
  );

  const handleClearError = useCallback(
    (formId: string, field: string) => {
      if (errors[formId]?.[field]) {
        handleInputChange(formId, field, formDataList.find((f) => f.id === formId)?.[field as keyof InventoryFormData]?.toString() || "");
      }
    },
    [errors, handleInputChange, formDataList]
  );

  const onFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      for (const form of formDataList) {
        const normalized = normalize(form.productName || "");
        if (!normalized) continue;
        const exact = products.find(
          (p) => p.isActive && normalize(p.name) === normalized
        );
        if (exact && form.selectedExistingProduct !== exact._id) {
          handleExistingProductSelect(form.id, exact._id);
        }
      }
      handleSubmit(e);
    },
    [formDataList, products, handleExistingProductSelect, handleSubmit]
  );

  const handleAddProduct = useCallback(() => {
    const id = addNewForm();
    openEditor(id);
  }, [addNewForm, openEditor]);

  const handleDuplicateProduct = useCallback(
    (formId: string) => {
      duplicateForm(formId);
    },
    [duplicateForm]
  );

  const handleEditCard = useCallback(
    (formId: string) => {
      openEditor(formId);
    },
    [openEditor]
  );

  const handleModalSave = useCallback(() => {
    saveCurrentProduct();
  }, [saveCurrentProduct]);

  const handleModalSaveAndAdd = useCallback(() => {
    saveAndAddNew();
  }, [saveAndAddNew]);

  const handleSuccessViewInventory = useCallback(() => {
    handleSuccessClose();
  }, [handleSuccessClose]);

  const handleSuccessAddMore = useCallback(() => {
    handleSuccessClose();
    resetForms();
  }, [handleSuccessClose, resetForms]);

  return (
    <div className="min-h-[80dvh]">
      {/* Page Header */}
      <PageHeader
        productCount={formDataList.length}
        isLoading={isLoading}
        onAddProduct={handleAddProduct}
        onSaveAll={onFormSubmit as any}
      />

      {/* Product Cards Grid */}
      {formDataList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {formDataList.map((formData, index) => (
            <ProductCard
              key={formData.id}
              formData={formData}
              index={index}
              hasErrors={!!(errors[formData.id] && Object.keys(errors[formData.id]).length > 0)}
              onEdit={() => handleEditCard(formData.id)}
              onDuplicate={() => handleDuplicateProduct(formData.id)}
              onRemove={() => removeForm(formData.id)}
              categories={categories as any}
              brands={brands as any}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center py-20 rounded-3xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <svg className="w-8 h-8" style={{ color: "rgba(148,163,184,0.4)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-1">No products yet</h3>
          <p className="text-sm mb-6" style={{ color: "rgba(148,163,184,0.6)" }}>
            Click &quot;Add Product&quot; to get started
          </p>
        </div>
      )}

      {/* Product Wizard Modal */}
      {editingForm && (
        <ProductWizardModal
          isOpen={!!editingForm}
          formData={editingForm}
          errors={editingErrors}
          categories={categories as any}
          brands={brands as any}
          products={filteredProductsByForm[editingForm.id] || products}
          onClose={closeEditor}
          onSave={handleModalSave}
          onSaveAndAdd={handleModalSaveAndAdd}
          onInputChange={(field, value) =>
            handleNormalizedInputChange(editingForm.id, field, value)
          }
          onImagesChange={(images) => handleImagesChange(editingForm.id, images)}
          onSpecificationChange={(field, value) =>
            handleSpecificationChange(editingForm.id, field, value)
          }
          onExistingProductSelect={(productId) =>
            handleExistingProductSelect(editingForm.id, productId)
          }
          onClearError={(field) => handleClearError(editingForm.id, field)}
        />
      )}

      {/* Save Confirmation Modal */}
      <SaveConfirmModal
        isOpen={showConfirmationPopup}
        isLoading={isLoading}
        productCount={formDataList.length}
        progress={progress}
        onConfirm={confirmSubmit}
        onCancel={() => setShowConfirmationPopup(false)}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessPopup}
        productCount={successfulProducts.length}
        onViewInventory={handleSuccessViewInventory}
        onAddMore={handleSuccessAddMore}
      />
    </div>
  );
}
