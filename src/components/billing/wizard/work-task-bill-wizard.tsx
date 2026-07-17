"use client";

import { useState, useEffect, useCallback } from "react";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { BillWizard } from "./bill-wizard";
import { useBillForm, BillFormData } from "@/hooks/use-bill-form";
import {
  useCustomers,
  useProducts,
  useBrands,
  useCategories,
} from "@/hooks/use-sanity-data";

interface WorkTaskBillWizardProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    _id: string;
    customerRef?: { _id?: string; name?: string; phone?: string } | null;
    completionNotes?: string;
    description?: string;
  } | null;
}

export function WorkTaskBillWizard({
  isOpen,
  onClose,
  task,
}: WorkTaskBillWizardProps) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);

  const { customers, isLoading: customersLoading } = useCustomers();
  const { activeProducts, isLoading: productsLoading } = useProducts();
  const { brands } = useBrands();
  const { categories } = useCategories();

  const {
    formData,
    selectedItems,
    isLoading,
    savingDraft,
    isDirty,
    showSuccessModal,
    showAlertModal,
    alertMessage,
    handleInputChange,
    addItemToBill,
    addCustomItemToBill,
    updateItemQuantity,
    removeItem,
    calculateTotal,
    calculateGrandTotal,
    getPaymentDetails,
    handleSubmit,
    saveDraft,
    setShowAlertModal,
    clearLocalDraft,
  } = useBillForm();

  useEffect(() => {
    if (isOpen) {
      setTaskCompleted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && task?.customerRef?._id && customers.length > 0 && !formData.customerId) {
      handleInputChange("customerId", task.customerRef._id);
    }
  }, [isOpen, task?.customerRef?._id, customers, formData.customerId, handleInputChange]);

  useEffect(() => {
    if (isOpen && task && !formData.notes) {
      const notes = task.completionNotes || task.description || "";
      if (notes) {
        handleInputChange("notes", notes);
      }
    }
  }, [isOpen, task?.completionNotes, task?.description, formData.notes, handleInputChange]);

  useEffect(() => {
    if (showSuccessModal && task && !taskCompleted) {
      setTaskCompleted(true);
      fetch(`/api/work-tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      }).catch(() => {});
    }
  }, [showSuccessModal, task, taskCompleted]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true);
      return;
    }
    clearLocalDraft();
    onClose();
  }, [isDirty, clearLocalDraft, onClose]);

  const confirmClose = useCallback(async () => {
    await saveDraft();
    clearLocalDraft();
    setShowExitConfirm(false);
    onClose();
  }, [saveDraft, clearLocalDraft, onClose]);

  const discardAndClose = useCallback(() => {
    clearLocalDraft();
    setShowExitConfirm(false);
    onClose();
  }, [clearLocalDraft, onClose]);

  const handleWizardBack = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const selectedCustomer = customers.find((c) => c._id === formData.customerId);

  return (
    <>
      <BaseGlassModal
        isOpen={isOpen}
        onClose={handleClose}
        size="xl"
        glassMaxWidth="1100px"
        glassHeight="min(760px, calc(100dvh - 100px))"
        glassMaxHeight="calc(100dvh - 24px)"
        zIndex={220}
        mobileType="center"
        showCloseButton={false}
        className="[&_.glass-modal-scroll]:!overflow-visible [&_.glass-modal-scroll]:!flex [&_.glass-modal-scroll]:!flex-col [&_.glass-modal-scroll]:!p-0"
      >
        <BillWizard
          formData={formData}
          selectedItems={selectedItems}
          customers={customers}
          customersLoading={customersLoading}
          activeProducts={activeProducts}
          productsLoading={productsLoading}
          categories={categories}
          brands={brands}
          isLoading={isLoading}
          savingDraft={savingDraft}
          isDirty={isDirty}
          autocompleteResetKey={0}
          selectedCustomer={selectedCustomer}
          enableRewinding={false}
          enableFitting={false}
          onInputChange={(field, value) =>
            handleInputChange(field as keyof BillFormData, value)
          }
          addItemToBill={addItemToBill}
          addCustomItemToBill={addCustomItemToBill}
          updateItemQuantity={(itemId, quantity) => {
            const product = activeProducts.find((p) => p._id === itemId);
            const maxStock = product
              ? product.inventory.currentStock
              : Infinity;
            updateItemQuantity(itemId, quantity, maxStock);
          }}
          removeItem={removeItem}
          calculateTotal={calculateTotal}
          calculateGrandTotal={calculateGrandTotal}
          getPaymentDetails={getPaymentDetails}
          handleSubmit={handleSubmit}
          saveDraft={saveDraft}
          onBack={handleWizardBack}
          onSetActiveSection={(section) =>
            console.log("section changed:", section)
          }
          submitButtonText="Create Bill & Done Task"
        />
      </BaseGlassModal>

      <ConfirmationModal
        isOpen={showExitConfirm}
        onClose={discardAndClose}
        onConfirm={confirmClose}
        title="Unsaved bill data"
        message="You have unsaved changes. Save as draft or discard?"
        type="confirm"
        confirmText="Save as Draft"
        cancelText="Discard"
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={onClose}
        title="Bill Created & Task Completed"
        message="The bill has been created and the work task is marked as done."
        type="confirm"
        confirmText="Done"
        onConfirm={onClose}
      />

      <ConfirmationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title="Alert"
        message={alertMessage}
        type="alert"
        confirmText="OK"
        onConfirm={() => setShowAlertModal(false)}
      />
    </>
  );
}
