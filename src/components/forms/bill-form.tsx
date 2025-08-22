"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { ActionButton } from "@/components/ui/action-button";
import { FileText, Plus } from "lucide-react";
import { useBillForm } from "@/hooks/useBillForm";
import { Customer, Item, BillFormData } from "@/types";
import { CustomerSelection } from "./bill-form/customer-selection";
import { ServiceLocationSelection } from "./bill-form/service-location-selection";
import { AvailableItemsList } from "./bill-form/available-items-list";
import { SelectedItemsList } from "./bill-form/selected-items-list";
import { BillSummary } from "./bill-form/bill-summary";
import { NotesSection } from "./bill-form/notes-section";

interface BillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (billData: BillFormData) => Promise<void>;
  customers: Customer[];
  items: Item[];
  isLoading?: boolean;
}

export function BillForm({
  isOpen,
  onClose,
  onSubmit,
  customers,
  items,
  isLoading = false,
}: BillFormProps) {
  const {
    formData,
    isSubmitting,
    isValid,
    updateField,
    addItemToBill,
    updateItemQuantity,
    removeItem,
    calculateTotals,
    handleSubmit,
  } = useBillForm({ onSubmit, onClose });

  const { subtotal, homeVisitFee, total } = calculateTotals();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Bill" size="xl">
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column - Bill Details */}
        <div className="space-y-4 sm:space-y-6 max-md:space-y-4">
          <CustomerSelection
            customers={customers}
            selectedCustomerId={formData.customerId || ""}
            onCustomerChange={(customerId) =>
              updateField("customerId", customerId)
            }
          />

          <ServiceLocationSelection
            serviceType={formData.serviceType || ""}
            locationType={formData.locationType || ""}
            onServiceTypeChange={(value) => updateField("serviceType", value)}
            onLocationTypeChange={(value) => updateField("locationType", value)}
          />

          <AvailableItemsList items={items} onItemAdd={addItemToBill} />

          <NotesSection
            notes={formData.notes || ""}
            onNotesChange={(notes) => updateField("notes", notes)}
          />
        </div>

        {/* Right Column - Selected Items & Total */}
        <div className="space-y-4 sm:space-y-6 max-md:space-y-4">
          {/* Selected Items */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Selected Items
            </h3>
            <SelectedItemsList
              items={formData.items}
              onQuantityUpdate={updateItemQuantity}
              onItemRemove={removeItem}
            />
          </div>

          {/* Bill Summary */}
          <BillSummary
            subtotal={subtotal}
            homeVisitFee={homeVisitFee}
            total={total}
          />
        </div>
      </div>

      {/* Fixed Action Buttons for Mobile */}
      <div className="sticky bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-4 sm:p-6 mt-4 sm:mt-6 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <ActionButton
            className="flex-1 w-full"
            onClick={handleSubmit}
            disabled={!isValid}
            loading={isSubmitting || isLoading}
            variant="primary"
            icon={<Plus className="w-4 h-4" />}>
            Create Bill
          </ActionButton>
          <ActionButton
            variant="outline"
            className="flex-1 w-full"
            onClick={onClose}
            disabled={isSubmitting || isLoading}>
            Cancel
          </ActionButton>
        </div>
      </div>
    </Modal>
  );
}
