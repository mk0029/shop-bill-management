"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  useCustomers,
  useProducts,
  useBrands,
  useCategories,
} from "@/hooks/use-sanity-data";
import { useItemSelection } from "@/hooks/use-item-selection";
import { CustomerInfoSection } from "@/components/billing/customer-info-section";
import { ItemSelectionSection } from "@/components/billing/item-selection-section";
import { SelectedItemsList } from "@/components/billing/selected-items-list";
import { BillSummarySidebar } from "@/components/billing/bill-summary-sidebar";
import { ItemSelectionModal } from "@/components/billing/item-selection-modal";
import { RewindingKitForm } from "@/components/billing/RewindingKitForm";
import FittingForm from "@/components/billing/FittingForm";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";
import { Switch } from "@/components/ui/switch";
import { useBillForm, BillFormData } from "@/hooks/use-bill-form";

function mapBillToFormData(bill: any): {
  formData: Partial<BillFormData>;
  items: any[];
} {
  const existingPaid = Number(bill?.paidAmount || 0);
  const existingPayStatus = String(bill?.paymentStatus || "").toLowerCase();
  const isPaid = existingPayStatus === "paid";
  const isPartial =
    existingPayStatus === "partial" || (!isPaid && existingPaid > 0);
  const formData: Partial<BillFormData> = {
    customerId: bill?.customer?._id || bill?.customer?._ref || "",
    serviceType: String(bill?.serviceType || "sale"),
    location: String(bill?.locationType || "shop"),
    billDate: bill?.billDate
      ? String(bill.billDate).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    dueDate: bill?.dueDate ? String(bill.dueDate).slice(0, 10) : "",
    notes: String(bill?.notes || ""),
    repairFee: Number(bill?.repairFee || 0),
    homeVisitFee: Number(bill?.homeVisitFee || 0),
    discount: Number(bill?.discount || 0),
    isMarkAsPaid: isPaid,
    enablePartialPayment: isPartial,
    partialPaymentAmount: isPartial ? existingPaid : 0,
  };

  const selectedItems = Array.isArray(bill?.items)
    ? bill.items.map((it: any) => {
        const pid = it?.product?._id || it?.product?._ref;
        const itemType = pid
          ? "standard"
          : String(it?.category || "")
                .toLowerCase()
                .includes("rewind")
            ? "rewinding"
            : "custom";
        const id = pid || `custom-${Math.random().toString(36).slice(2)}`;
        const price = Number(it?.unitPrice || 0);
        const quantity = Number(it?.quantity || 0);
        return {
          id,
          name: String(
            it?.productName || it?.name || it?.product?.name || "Item",
          ),
          price,
          quantity,
          total: Number(it?.totalPrice ?? price * quantity),
          category: String(it?.category || ""),
          brand: String(it?.brand || ""),
          specifications:
            typeof it?.specifications === "string"
              ? it.specifications
              : JSON.stringify(it?.specifications || ""),
          unit: String(it?.unit || "pcs"),
          itemType,
          maxStock: undefined,
        };
      })
    : [];

  return { formData, items: selectedItems };
}

export default function SuperBillUpdateModal(props: {
  isOpen: boolean;
  onClose: () => void;
  billId: string;
  initialBill: any;
  onSaved?: (updated: any) => void;
}) {
  const { isOpen, onClose, billId, initialBill, onSaved } = props;

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
    saveDraft,
    setShowAlertModal,
    setSelectedItems,
    setAlertMessage,
  } = useBillForm();

  const [activeSection, setActiveSection] = useState<
    "customer" | "rewinding" | "fitting" | "items"
  >("customer");
  const [enableRewinding, setEnableRewinding] = useState(false);
  const [enableFitting, setEnableFitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    itemSelectionModal,
    openItemSelectionModal,
    closeItemSelectionModal,
    updateSpecificationFilter,
    filterItemsBySpecifications,
  } = useItemSelection();

  const filteredItems = filterItemsBySpecifications(activeProducts);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === formData.customerId),
    [customers, formData.customerId],
  );

  useEffect(() => {
    if (!isOpen) return;
    const mapped = mapBillToFormData(initialBill);
    try {
      for (const [k, v] of Object.entries(mapped.formData)) {
        handleInputChange(k as keyof BillFormData, v as any);
      }
      setSelectedItems(mapped.items as any);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, billId]);

  const handleOpenCategory = (categoryName: string) => {
    openItemSelectionModal(String(categoryName || "").toLowerCase());
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const paymentDetails = getPaymentDetails();
      const payload = {
        customerId: formData.customerId,
        serviceType: formData.serviceType,
        locationType: formData.location,
        billDate: formData.billDate,
        dueDate: formData.dueDate,
        notes: formData.notes,
        homeVisitFee: Number(formData.homeVisitFee || 0),
        repairFee: Number(formData.repairFee || 0),
        discount: Number(formData.discount || 0),
        paymentStatus: paymentDetails.paymentStatus,
        paidAmount: paymentDetails.paidAmount,
        balanceAmount: paymentDetails.balanceAmount,
        items: selectedItems.map((item: any) => ({
          productId: item.itemType === "standard" ? item.id : undefined,
          productName: item.name,
          category: item.category,
          brand: item.brand,
          specifications: item.specifications,
          quantity: Number(item.quantity),
          unitPrice: Number(item.price),
          unit: item.unit,
        })),
      };

      const res = await fetch(
        `/api/super/bills/${encodeURIComponent(String(billId))}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }
      onSaved?.(json?.data);
      onClose();
    } catch (e: any) {
      try {
        setAlertMessage(e?.message || "Failed to update bill");
        setShowAlertModal(true);
      } catch {}
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" title="Update Bill">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 max-md:space-y-4">
          <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-white font-medium">Optional Sections</div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-gray-300">
                  <Switch
                    checked={enableRewinding}
                    onCheckedChange={setEnableRewinding}
                  />
                  <span>Rewinding</span>
                </label>
                <label className="flex items-center gap-2 text-gray-300">
                  <Switch
                    checked={enableFitting}
                    onCheckedChange={setEnableFitting}
                  />
                  <span>Fitting/Wiring</span>
                </label>
              </div>
            </div>
          </div>

          <ResponsiveAccordion
            desktopCollapsible
            title={
              <h2 className="text-white font-semibold">Customer Information</h2>
            }
            open={activeSection === "customer"}
            onOpenChange={(next) => next && setActiveSection("customer")}
          >
            <CustomerInfoSection
              formData={formData}
              customers={customers}
              customersLoading={customersLoading}
              onInputChange={(field, value) =>
                handleInputChange(field as keyof BillFormData, value)
              }
            />
          </ResponsiveAccordion>

          {enableRewinding && (
            <ResponsiveAccordion
              desktopCollapsible
              title={
                <h2 className="text-white font-semibold">
                  Rewinding Services & Items
                </h2>
              }
              open={activeSection === "rewinding"}
              onOpenChange={(next) => next && setActiveSection("rewinding")}
            >
              <RewindingKitForm
                onAddItem={addCustomItemToBill}
                onSubmitted={() => setActiveSection("items")}
              />
            </ResponsiveAccordion>
          )}

          {enableFitting && (
            <ResponsiveAccordion
              desktopCollapsible
              title={
                <h2 className="text-white font-semibold">Fitting/Wiring</h2>
              }
              open={activeSection === "fitting"}
              onOpenChange={(next) => next && setActiveSection("fitting")}
            >
              <FittingForm
                onAddItem={addCustomItemToBill}
                onSubmitted={() => setActiveSection("items")}
              />
            </ResponsiveAccordion>
          )}

          <ResponsiveAccordion
            desktopCollapsible
            title={<h2 className="text-white font-semibold">Bill Items</h2>}
            open={activeSection === "items"}
            onOpenChange={(next) => next && setActiveSection("items")}
          >
            <ItemSelectionSection
              categories={categories}
              activeProducts={activeProducts}
              productsLoading={productsLoading}
              onOpenItemModal={handleOpenCategory}
            />
          </ResponsiveAccordion>

          <SelectedItemsList
            selectedItems={selectedItems as any}
            onUpdateQuantity={(itemId, quantity) => {
              const product = activeProducts.find((p: any) => p._id === itemId);
              const maxStock = product
                ? product.inventory.currentStock
                : Infinity;
              updateItemQuantity(itemId, quantity, maxStock);
            }}
            onRemoveItem={removeItem}
            onClearAll={() => setSelectedItems([])}
          />
        </div>

        <div>
          <BillSummarySidebar
            selectedCustomer={selectedCustomer as any}
            selectedItems={selectedItems as any}
            formData={formData as any}
            calculateTotal={calculateTotal}
            calculateGrandTotal={calculateGrandTotal}
            getPaymentDetails={getPaymentDetails}
            onInputChange={handleInputChange as any}
            onSubmit={handleSave as any}
            isLoading={isLoading || isSaving}
            onSaveDraft={saveDraft}
            savingDraft={savingDraft}
          />
          <div className="mt-3">
            <Button
              onClick={handleSave}
              disabled={isLoading || isSaving || !formData.customerId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? "Updating..." : "Update Bill"}
            </Button>
          </div>
        </div>
      </div>

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
        onClose={onClose}
        onConfirm={onClose}
        title="Bill updated"
        message="Bill updated successfully."
        type="success"
      />

      <ConfirmationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        onConfirm={() => setShowAlertModal(false)}
        title="Alert"
        message={alertMessage}
        type="alert"
      />
    </Modal>
  );
}
