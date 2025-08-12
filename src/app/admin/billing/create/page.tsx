"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const { customers, isLoading: customersLoading } = useCustomers();
  const { activeProducts, isLoading: productsLoading } = useProducts();
  const { brands } = useBrands();
  const { categories } = useCategories();

  const {
    formData,
    selectedItems,
    isLoading,
    showSuccessModal,
    showAlertModal,
    alertMessage,
    handleInputChange,
    addItemToBill,
    addCustomItemToBill,
    updateItemQuantity,
    removeItem,
    calculateTotal,
    handleSubmit,
    handleSuccessClose,
    setShowAlertModal,
    setSelectedItems,
  } = useBillForm();

  const {
    itemSelectionModal,
    openItemSelectionModal,
    closeItemSelectionModal,
    updateSpecificationFilter,
    filterItemsBySpecifications,
  } = useItemSelection();

  const selectedCustomer = customers.find((c) => c._id === formData.customerId);
  const filteredItems = filterItemsBySpecifications(activeProducts);
  const [showRewindingForm, setShowRewindingForm] = useState(false);

  return (
    <div className="space-y-6 max-md:pb-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            Create New Bill
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">
            Generate a new invoice for your customer
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill Form */}
        <div className="lg:col-span-2 space-y-6">
          <CustomerInfoSection
            formData={formData}
            customers={customers}
            customersLoading={customersLoading}
            onInputChange={(field, value) =>
              handleInputChange(field as keyof BillFormData, value)
            }
          />
          {!showRewindingForm && (
            <Button
              variant="outline"
              onClick={() => setShowRewindingForm(true)}
              className="w-full"
            >
              Add Rewinding Service/Item
            </Button>
          )}

          {showRewindingForm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Rewinding Services & Items
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRewindingForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <XIcon />
                </Button>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <p className="text-sm text-gray-300 mb-4">
                  Fill out multiple custom services or items below. All entries
                  will be added to your bill when you click &quot;Submit All
                  Services&quot;.
                </p>
                <RewindingKitForm onAddItem={addCustomItemToBill} />
              </div>
            </div>
          )}

          <ItemSelectionSection
            categories={categories}
            activeProducts={activeProducts}
            productsLoading={productsLoading}
            onOpenItemModal={openItemSelectionModal}
          />

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
        <BillSummarySidebar
          selectedCustomer={selectedCustomer}
          selectedItems={selectedItems}
          formData={formData}
          calculateTotal={calculateTotal}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
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
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        title="Bill Created Successfully!"
        message="The bill has been created and is ready for your customer."
        confirmText="View All Bills"
        onConfirm={handleSuccessClose}
      />

      <ConfirmationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        title="Alert"
        message={alertMessage}
        confirmText="OK"
        onConfirm={() => setShowAlertModal(false)}
      />
    </div>
  );
}
