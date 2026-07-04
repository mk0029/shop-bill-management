"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  useCustomers,
  useProducts,
  useBrands,
  useCategories,
} from "@/hooks/use-sanity-data";
import { useBillForm, BillFormData } from "@/hooks/use-bill-form";
import { BillWizard } from "@/components/billing/wizard/bill-wizard";

export default function CreateBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedCustomerId = searchParams?.get("customerId") || "";

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [customerAutocompleteResetKey, setCustomerAutocompleteResetKey] =
    useState(0);

  const confirmSaveDraftAndExit = async () => {
    await saveDraft();
    clearLocalDraft();
    setShowExitConfirm(false);
    router.back();
  };

  const discardAndExit = () => {
    clearLocalDraft();
    setShowExitConfirm(false);
    router.back();
  };

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
    handleSuccessClose,
    handleCreateAnotherBill: handleCreateAnotherBillBase,
    setShowAlertModal,
    clearLocalDraft,
  } = useBillForm();

  const handleBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
      return;
    }
    router.back();
  };

  const handleCreateAnotherBill = () => {
    handleCreateAnotherBillBase();
    setCustomerAutocompleteResetKey((prev) => prev + 1);
  };

  const selectedCustomer = customers.find((c) => c._id === formData.customerId);

  // Intercept browser back navigation
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (isDirty) {
        e.preventDefault?.();
        setShowExitConfirm(true);
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty]);

  // Pre-select customer if customerId is provided in URL
  useEffect(() => {
    if (preSelectedCustomerId && customers.length > 0 && !formData.customerId) {
      const customer = customers.find((c) => c._id === preSelectedCustomerId);
      if (customer) {
        handleInputChange("customerId", preSelectedCustomerId);
      }
    }
  }, [
    preSelectedCustomerId,
    customers,
    formData.customerId,
    handleInputChange,
  ]);

  const pageRootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const adminMain = document.querySelector<HTMLElement>("main.admin-main");
    adminMain?.scrollTo({ top: 0, left: 0 });
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  return (
    <div
      ref={pageRootRef}
      className="create-bill-page flex flex-col overflow-hidden"
    >
      <ConfirmationModal
        isOpen={showExitConfirm}
        onClose={discardAndExit}
        onConfirm={confirmSaveDraftAndExit}
        title="Unsaved bill data"
        message="You have unsaved changes. Save as draft or discard?"
        type="confirm"
        confirmText="Save as Draft"
        cancelText="Discard"
      />

      {/* Wizard Shell */}
      <div className="flex-1 min-h-0 overflow-hidden md:pt-4">
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
          autocompleteResetKey={customerAutocompleteResetKey}
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
          onBack={handleBack}
          onSetActiveSection={(section) =>
            console.log("section changed:", section)
          }
        />
      </div>

      {/* Success Modal */}
      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={handleCreateAnotherBill}
        title="Bill Created Successfully!"
        message="Your bill has been created. Review the summary below."
        confirmText="View All Bills"
        cancelText="Create Another"
        onConfirm={handleSuccessClose}
        size="lg"
        content={
          <div className="space-y-4">
            <div className="text-white font-medium">Items</div>
            <div className="space-y-2">
              {selectedItems.length === 0 ? (
                <div style={{ color: "rgba(148,163,184,0.5)" }}>
                  No items added.
                </div>
              ) : (
                selectedItems.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-start justify-between gap-3 pb-2"
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div>
                      <div className="text-white font-medium text-sm">
                        {i.name}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "rgba(148,163,184,0.5)" }}
                      >
                        {i.category}
                        {/Rewinding/i.test(i.category) && " • Rewinding"}
                        {/Fitting\/Wiring/i.test(i.category) &&
                          " • Fitting/Wiring"}
                      </div>
                      {i.specifications && (
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "rgba(148,163,184,0.4)" }}
                        >
                          {i.specifications}
                        </div>
                      )}
                    </div>
                    <div className="text-right min-w-0">
                      <div style={{ color: "rgba(148,163,184,0.6)" }}>
                        {i.quantity} × ₹{Number(i.price).toFixed(2)}
                      </div>
                      <div className="text-white font-semibold">
                        ₹{Number(i.total).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="text-xs"
                  style={{ color: "rgba(148,163,184,0.5)" }}
                >
                  Repair Fee
                </div>
                <div className="text-white font-semibold">
                  ₹{Number(formData.repairFee || 0).toFixed(2)}
                </div>
              </div>
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="text-xs"
                  style={{ color: "rgba(148,163,184,0.5)" }}
                >
                  Visiting Fee
                </div>
                <div className="text-white font-semibold">
                  ₹{Number(formData.visitingCharges || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* Alert Modal */}
      {(() => {
        const isRestoreAlert = alertMessage?.startsWith(
          "Restored unsaved bill",
        );
        return (
          <ConfirmationModal
            isOpen={showAlertModal}
            onClose={() => {
              if (isRestoreAlert) {
                setShowAlertModal(false);
                router.replace("/admin/billing/create?fresh=1");
              } else {
                setShowAlertModal(false);
              }
            }}
            title={isRestoreAlert ? "Restored Draft" : "Alert"}
            message={alertMessage}
            type={isRestoreAlert ? "confirm" : "alert"}
            confirmText="OK"
            onConfirm={() => setShowAlertModal(false)}
          />
        );
      })()}
    </div>
  );
}

