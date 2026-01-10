"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
import FittingForm from "@/components/billing/FittingForm";
import ResponsiveAccordion from "@/components/ui/responsive-accordion";

export default function CreateBillPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedCustomerId = searchParams?.get("customerId") || "";
  
  // Exit confirmation state and handlers
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [activeSection, setActiveSection] = useState<"customer" | "rewinding" | "fitting" | "items">("customer");

  // Refs for accordion sections to enable scroll-to-header on open
  const customerRef = useRef<HTMLDivElement>(null);
  const rewindingRef = useRef<HTMLDivElement>(null);
  const fittingRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  // Visibility toggles
  const [enableRewinding, setEnableRewinding] = useState<boolean>(false);
  const [enableFitting, setEnableFitting] = useState<boolean>(false);

  // Persist toggle state in sessionStorage
  useEffect(() => {
    try {
      const r = sessionStorage.getItem("bill_toggle_rewinding");
      const f = sessionStorage.getItem("bill_toggle_fitting");
      if (r != null) setEnableRewinding(r === "1");
      if (f != null) setEnableFitting(f === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem("bill_toggle_rewinding", enableRewinding ? "1" : "0"); } catch {}
  }, [enableRewinding]);
  useEffect(() => {
    try { sessionStorage.setItem("bill_toggle_fitting", enableFitting ? "1" : "0"); } catch {}
  }, [enableFitting]);

  const confirmSaveDraftAndExit = async () => {
    await saveDraft();
    clearLocalDraft();
    setShowExitConfirm(false);
    router.back();
  };

  // Helper to open a section and immediately scroll its header into view
  const handleOpenSection = (section: "customer" | "rewinding" | "fitting" | "items") => {
  setTimeout(() => {
    setActiveSection(section);
    requestAnimationFrame(() => {
      document
        .getElementById(`${section}-section`)
        ?.scrollIntoView({ behavior: "smooth", block: "start", });
    });
  }, 400);
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

  // Auto-enable and focus Fitting section when service type is Fitting/Wiring
  useEffect(() => {
    if (formData.serviceType === "fitting_wiring") {
      if (!enableFitting) setEnableFitting(true);
      // open the Fitting section
      setActiveSection("fitting");
      // ensure persisted toggle reflects this
      try { sessionStorage.setItem("bill_toggle_fitting", "1"); } catch {}
    }
  }, [formData.serviceType]);

  const handleBack = () => {

      router.push("/admin/billing");
    
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

  // // When opening a section, scroll its header to top with a small offset
  // useEffect(() => {
  //   const sectionEl =
  //     activeSection === "customer"
  //       ? customerRef.current
  //       : activeSection === "rewinding"
  //       ? rewindingRef.current
  //       : activeSection === "items"
  //       ? itemsRef.current
  //       : null;

  //   if (!sectionEl) return;
  //   // Use bounding rect + page scroll to compute absolute Y, minus a small padding
  //   const top = sectionEl.getBoundingClientRect().top + window.scrollY - 80;
  //   window.scrollTo({ top, behavior: "smooth" });
  // }, [activeSection]);

  return (
    <div className="space-y-6 max-md:space-y-4 max-md:pb-4">
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
        {/* Save as Draft moved to sidebar next to Create Bill */}
      </div>

      {/* Section visibility toggles */}
    

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bill Form */}
        <div className="lg:col-span-2 space-y-6 max-md:space-y-4">
          {/* Accordion Section: Customer Information */}
          <div ref={customerRef}>
            <ResponsiveAccordion
              desktopCollapsible
              title={
                <div>
                  <h2 className="text-white font-semibold">Customer Information</h2>
                </div>
              }
              open={activeSection === "customer"}
              onOpenChange={(next) => {
                if (next) handleOpenSection("customer");
                // ignore close to always keep one open
              }}
            >
              <div className="sm:px-2 sm:pb-1">
                <CustomerInfoSection
                  formData={formData}
                  customers={customers}
                  customersLoading={customersLoading}
                  onInputChange={(field, value) =>
                    handleInputChange(field as keyof BillFormData, value)
                  }
                />
              </div>
            </ResponsiveAccordion>
          </div>
  <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-white font-medium">Optional Sections</div>
          <div className="flex flex-wrap gap-4">
            {formData.serviceType !== "fitting_wiring" && (
              <label className="flex items-center gap-2 text-gray-300">
                <Switch checked={enableRewinding} onCheckedChange={setEnableRewinding} />
                <span>Rewinding</span>
              </label>
            )}
            {formData.serviceType === "custom" && (
              <label className="flex items-center gap-2 text-gray-300">
                <Switch
                  checked={enableFitting}
                  onCheckedChange={setEnableFitting}
                />
                <span>Fitting/Wiring</span>
              </label>
            )}
          </div>
        </div>
      </div>
          {/* Accordion Section: Rewinding */}
          {enableRewinding && (
            <div ref={rewindingRef}>
              <ResponsiveAccordion
                desktopCollapsible
                title={
                  <div>
                    <h2 className="text-white font-semibold">Rewinding Services & Items</h2>
                  </div>
                }
                open={activeSection === "rewinding"}
                onOpenChange={(next) => {
                  if (next) handleOpenSection("rewinding");
                }}
              >
                <div className="sm:px-2 sm:pb-1">
                  <RewindingKitForm
                    onAddItem={addCustomItemToBill}
                    onSubmitted={() => setActiveSection("items")}
                  />
                </div>
              </ResponsiveAccordion>
            </div>
          )}

          {/* Accordion Section: Fitting/Wiring */}
          {enableFitting && (
            <div ref={fittingRef}>
              <ResponsiveAccordion
                desktopCollapsible
                title={
                  <div>
                    <h2 className="text-white font-semibold">Fitting/Wiring</h2>
                  </div>
                }
                open={activeSection === "fitting"}
                onOpenChange={(next) => {
                  if (next) handleOpenSection("fitting");
                }}
              >
                <div className="sm:px-2 sm:pb-1">
                  <FittingForm
                    onAddItem={addCustomItemToBill}
                    onSubmitted={() => setActiveSection("items")}
                  />
                </div>
              </ResponsiveAccordion>
            </div>
          )}

          {/* Accordion Section: Bill Items */}
          <div ref={itemsRef}>
            <ResponsiveAccordion
              desktopCollapsible
              title={
                <div>
                  <h2 className="text-white font-semibold">Bill Items</h2>
                </div>
              }
              open={activeSection === "items"}
              onOpenChange={(next) => {
                if (next) handleOpenSection("items");
              }}
            >
              <div className="sm:px-2 sm:pb-1">
                <ItemSelectionSection
                  categories={categories}
                  activeProducts={activeProducts}
                  productsLoading={productsLoading}
                  onOpenItemModal={handleOpenCategory}
                />
              </div>
            </ResponsiveAccordion>
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
          onSaveDraft={saveDraft}
          savingDraft={savingDraft}
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
        message="Your bill has been created. Review the summary below."
        confirmText="View All Bills"
        cancelText="Create Bill"
        onConfirm={handleSuccessClose}
        size="lg"
        content={(
          <div className="space-y-4">
            <div className="text-gray-200 font-medium">Items</div>
            <div className="space-y-2">
              {selectedItems.length === 0 ? (
                <div className="text-gray-400">No items added.</div>
              ) : (
                selectedItems.map((i) => (
                  <div key={i.id} className="flex items-start justify-between gap-3 border-b border-gray-800 pb-2">
                    <div>
                      <div className="text-white font-medium">{i.name}</div>
                      <div className="text-xs text-gray-400">
                        {i.category}
                        {/Rewinding/i.test(i.category) && " • Rewinding"}
                        {/Fitting\/Wiring/i.test(i.category) && " • Fitting/Wiring"}
                      </div>
                      {i.specifications && (
                        <div className="text-xs text-gray-500 mt-0.5">{i.specifications}</div>
                      )}
                    </div>
                    <div className="text-right text-gray-300 min-w-[140px]">
                      <div>{i.quantity} × ₹{Number(i.price).toFixed(2)}</div>
                      <div className="text-white font-semibold">₹{Number(i.total).toFixed(2)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-900/60 border border-gray-800 rounded-md p-3">
                <div className="text-xs text-gray-400">Repair Fee</div>
                <div className="text-white font-semibold">₹{Number(formData.repairFee || 0).toFixed(2)}</div>
              </div>
              <div className="bg-gray-900/60 border border-gray-800 rounded-md p-3">
                <div className="text-xs text-gray-400">Home Visit</div>
                <div className="text-white font-semibold">₹{Number(formData.homeVisitFee || 0).toFixed(2)}</div>
              </div>
              <div className="bg-gray-900/60 border border-gray-800 rounded-md p-3">
                <div className="text-xs text-gray-400">Labor</div>
                <div className="text-white font-semibold">₹{Number(formData.laborCharges || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div>Sections used:</div>
              <div className="flex gap-2">
                <span className={`px-2 py-0.5 rounded border ${enableRewinding ? 'border-green-700 text-green-400' : 'border-gray-700 text-gray-500'}`}>Rewinding {enableRewinding ? 'ON' : 'OFF'}</span>
                <span className={`px-2 py-0.5 rounded border ${enableFitting ? 'border-green-700 text-green-400' : 'border-gray-700 text-gray-500'}`}>Fitting {enableFitting ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>
        )}
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
