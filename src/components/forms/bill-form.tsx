"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Bill Details */}
        <div className="space-y-6">
          <CustomerSelection
            customers={customers}
            selectedCustomerId={formData.customerId}
            onCustomerChange={(customerId) =>
              updateField("customerId", customerId)
            }
          />

          <ServiceLocationSelection
            serviceType={formData.serviceType}
            locationType={formData.locationType}
            onServiceTypeChange={(value) => updateField("serviceType", value)}
            onLocationTypeChange={(value) => updateField("locationType", value)}
          />

          <AvailableItemsList items={items} onItemAdd={addItemToBill} />

          <NotesSection
            notes={formData.notes}
            onNotesChange={(notes) => updateField("notes", notes)}
          />
        </div>

        {/* Right Column - Selected Items & Total */}
        <div className="space-y-6">
          {/* Selected Items */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Bill...
                </div>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bill
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
