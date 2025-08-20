"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ArrowLeft, XIcon } from "lucide-react";
import {
  useCustomers,
  useProducts,
  useBrands,
  useCategories,
} from "@/hooks/use-sanity-data";
import { useBillForm, BillFormData } from "@/hooks/use-bill-form";
import { useItemSelection } from "@/hooks/use-item-selection";
import { CustomerInfoSection } from "@/components/billing/customer-info-section";
import { ItemSelectionSection } from "@/components/billing/item-selection-section";
import { SelectedItemsList } from "@/components/billing/selected-items-list";
import { BillSummarySidebar } from "@/components/billing/bill-summary-sidebar";
import { ItemSelectionModal } from "@/components/billing/item-selection-modal";
import { RewindingKitForm } from "@/components/billing/RewindingKitForm";

export default function CreateBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedCustomerId = searchParams.get("customerId");

  // Exit confirmation state and handlers
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState<"customer" | "rewinding" | "items">("customer");

  const confirmSaveDraftAndExit = async () => {
    await saveDraft();
    clearLocalDraft();
    setShowExitConfirm(false);
    router.back();
  };

  const discardAndExit = async () => {
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
    handleCreateAnotherBill,
    setShowAlertModal,
    setSelectedItems,
    clearLocalDraft,
  } = useBillForm();

  const handleBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      router.back();
    }
  };

  const {
    itemSelectionModal,
    openItemSelectionModal,
    closeItemSelectionModal,
    setSelectedCategory,
    updateSpecificationFilter,
    filterItemsBySpecifications,
  } = useItemSelection();

  const selectedCustomer = customers.find((c) => c._id === formData.customerId);
  const filteredItems = filterItemsBySpecifications(activeProducts);
  // Replaced by accordion section state

  const handleOpenCategory = (categoryName: string) => {
    const lower = categoryName.toLowerCase();
    // Always open the item selection modal. Subcategory selection will be handled inside the modal via dropdown.
    openItemSelectionModal(lower);
  };

  // Intercept browser back navigation to show confirm modal if dirty
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (isDirty) {
        e.preventDefault?.();
        setShowExitConfirm(true);
        // Push state back to prevent leaving until user chooses
        window.history.pushState(null, "", window.location.href);
      }
    };
    // Push a new state so that back button triggers popstate here
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

  return (
    <div className="space-y-6 max-md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Create New Bill
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base max-sm:max-w-[80%]">
              Generate a new invoice for your customer
            </p>
          </div>

      {/* Exit confirmation */}
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
        </div>
        <div className="shrink-0">
          <Button variant="outline" onClick={saveDraft} disabled={savingDraft}>
            {savingDraft ? "Saving..." : "Save as Draft"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Accordion Section: Customer Information */}
          <div className="rounded-lg border border-gray-800 bg-gray-900">
            <button
              type="button"
              onClick={() => setActiveSection("customer")}
              className="w-full text-left px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-white font-semibold">Customer Information</h2>
              <p className="text-gray-400 text-sm">Select customer and billing meta</p>
            </button>
            {activeSection === "customer" && (
              <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                <CustomerInfoSection
                  formData={formData}
                  customers={customers}
                  customersLoading={customersLoading}
                  onInputChange={(field, value) =>
                    handleInputChange(field as keyof BillFormData, value)
                  }
                />
              </div>
            )}
          </div>

          {/* Accordion Section: Rewinding */}
          <div className="rounded-lg border border-gray-800 bg-gray-900">
            <button
              type="button"
              onClick={() => setActiveSection("rewinding")}
              className="w-full text-left px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-white font-semibold">Rewinding Services & Items</h2>
              <p className="text-gray-400 text-sm">Add custom services/items</p>
            </button>
            {activeSection === "rewinding" && (
              <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-300 mb-4">
                    Fill out multiple custom services or items below. All entries will be added when you submit.
                  </p>
                  <RewindingKitForm
                    onAddItem={addCustomItemToBill}
                    onSubmitted={() => setActiveSection("items")}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Accordion Section: Bill Items */}
          <div className="rounded-lg border border-gray-800 bg-gray-900">
            <button
              type="button"
              onClick={() => setActiveSection("items")}
              className="w-full text-left px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-white font-semibold">Bill Items</h2>
              <p className="text-gray-400 text-sm">Browse inventory and add items</p>
            </button>
            {activeSection === "items" && (
              <div className="px-4 pb-4 sm:px-6 sm:pb-6">
                <ItemSelectionSection
                  categories={categories}
                  activeProducts={activeProducts}
                  productsLoading={productsLoading}
                  onOpenItemModal={handleOpenCategory}
                />
              </div>
            )}
          </div>

          <SelectedItemsList
            selectedItems={selectedItems}
            onUpdateQuantity={(itemId, quantity) => {
              const product = activeProducts.find((p) => p._id === itemId);
              const maxStock = product
                ? product.inventory.currentStock
                : Infinity;
              updateItemQuantity(itemId, quantity, maxStock);
            }}
            onRemoveItem={removeItem}
            onClearAll={() => setSelectedItems([])}
          />
        </div>

        {/* Sidebar */}
        <div>
        <BillSummarySidebar
          selectedCustomer={selectedCustomer}
          selectedItems={selectedItems}
          formData={formData}
          calculateTotal={calculateTotal}
          calculateGrandTotal={calculateGrandTotal}
          getPaymentDetails={getPaymentDetails}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        /></div>
      </div>

      {/* Modals */}
      <ItemSelectionModal
        isOpen={itemSelectionModal.isOpen}
        onClose={closeItemSelectionModal}
        selectedCategory={itemSelectionModal.selectedCategory}
        selectedSpecifications={itemSelectionModal.selectedSpecifications}
        onUpdateSpecification={updateSpecificationFilter}
        filteredItems={filteredItems}
        brands={brands}
        onAddItem={addItemToBill}
        activeProducts={activeProducts}
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        // onClose should reset to a fresh bill and keep user on page
        onClose={handleCreateAnotherBill}
        title="Bill Created Successfully!"
        message="The bill has been created and is ready for your customer."
        confirmText="View All Bills"
        cancelText="Create Bill"
        onConfirm={handleSuccessClose}
      />

      {(() => {
        const isRestoreAlert = alertMessage?.startsWith(
          "Restored unsaved bill"
        );
        return (
          <ConfirmationModal
            isOpen={showAlertModal}
            onClose={() => {
              if (isRestoreAlert) {
                // Navigate to a fresh bill page; the hook will skip restore when fresh=1
                setShowAlertModal(false);
                router.replace("/admin/billing/create?fresh=1");
              } else {
                setShowAlertModal(false);
              }
            }}
            title="Alert"
            message={alertMessage}
            // Show Cancel only for restore alert; otherwise render as an alert (OK only)
            type={isRestoreAlert ? "confirm" : "alert"}
            confirmText="OK"
            onConfirm={() => setShowAlertModal(false)}
          />
        );
      })()}
    </div>
  );
}
