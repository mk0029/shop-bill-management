"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  User,
  Wrench,
  ShoppingCart,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerStep } from "./customer-step";
import { ServicesStep } from "./services-step";
import { BillItemsStep } from "./bill-items-step";
import { PaymentStep } from "./payment-step";
import { FloatingSummary } from "./floating-summary";
import { ItemSelectionModalV2 } from "./item-selection-modal-v2";

const STEPS = [
  { num: 1, label: "Customer", icon: User, title: "Customer & Bill Details" },
  {
    num: 2,
    label: "Charges",
    icon: Wrench,
    title: "Additional Charges & Optional Services",
  },
  { num: 3, label: "Items", icon: ShoppingCart, title: "Bill Items" },
  { num: 4, label: "Payment", icon: CreditCard, title: "Payment & Review" },
];

interface BillWizardProps {
  formData: any;
  selectedItems: any[];
  customers: any[];
  customersLoading: boolean;
  activeProducts: any[];
  productsLoading: boolean;
  categories: any[];
  brands: any[];
  isLoading: boolean;
  savingDraft: boolean;
  isDirty: boolean;
  autocompleteResetKey: number;
  selectedCustomer: any;
  enableRewinding: boolean;
  enableFitting: boolean;
  onInputChange: (field: string, value: any) => void;
  addItemToBill: (product: any) => void;
  addCustomItemToBill: (item: {
    productName: string;
    quantity: number;
    unitPrice: number;
    specifications?: string;
    category?: string;
    brand?: string;
    unit?: string;
  }) => void;
  updateItemQuantity: (
    itemId: string,
    quantity: number,
    maxStock?: number,
  ) => void;
  removeItem: (itemId: string) => void;
  calculateTotal: () => number;
  calculateGrandTotal: () => number;
  getPaymentDetails: () => {
    paymentStatus: "pending" | "partial" | "paid";
    paidAmount: number;
    balanceAmount: number;
  };
  handleSubmit: (e: React.FormEvent) => void;
  saveDraft: () => void;
  onBack: () => void;
  onSetActiveSection: (section: string) => void;
}

export function BillWizard({
  formData,
  selectedItems,
  customers,
  customersLoading,
  activeProducts,
  productsLoading,
  categories,
  brands,
  isLoading,
  savingDraft,
  isDirty,
  autocompleteResetKey,
  selectedCustomer,
  enableRewinding,
  enableFitting,
  onInputChange,
  addItemToBill,
  addCustomItemToBill,
  updateItemQuantity,
  removeItem,
  calculateTotal,
  calculateGrandTotal,
  getPaymentDetails,
  handleSubmit,
  saveDraft,
  onBack,
  onSetActiveSection,
}: BillWizardProps) {
  const [step, setStep] = useState(0);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [manualItemModalOpen, setManualItemModalOpen] = useState(false);
  const [showFloatingSummary, setShowFloatingSummary] = useState(false);
  const wizardRef = useRef<HTMLFormElement>(null);

  const [manualItem, setManualItem] = useState({
    productName: "",
    quantity: 1,
    unitPrice: 0,
    specifications: "",
    category: "",
    brand: "",
    unit: "pcs",
  });

  useEffect(() => {
    setShowFloatingSummary(selectedItems.length > 0 && step !== 3);
  }, [selectedItems.length, step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (itemModalOpen || manualItemModalOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDraft();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (step === 3) handleSubmit(e as any);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, itemModalOpen, manualItemModalOpen, saveDraft, handleSubmit]);

  const canGoNext = useCallback(() => {
    if (step === 0) return !!formData.customerId;
    return true;
  }, [step, formData.customerId]);

  const handlePrev = () => setStep((s) => Math.max(0, s - 1));
  const handleNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };
  const handleGoToStep = (targetStep: number) => setStep(targetStep);

  const currentStep = STEPS[step];

  return (
    <>
      <form
        onSubmit={(e) => e.preventDefault()}
        ref={wizardRef}
        className="h-full flex flex-col"
      >
        <div
          className="create-bill-modal relative flex flex-col min-h-0 overflow-hidden rounded-3xl"
          style={{
            background: "rgba(15,23,42,0.5)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.4)",
          }}
        >
          {/* Ambient glow */}
          <div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(56,189,248,0.3), transparent)",
            }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-10 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(139,92,246,0.3), transparent)",
            }}
          />

          {/* Wizard Header */}
          <div
            className="create-bill-modal-header relative z-10 flex min-h-16 items-center gap-3 border-b px-4 py-3 sm:px-6"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all sm:h-10 sm:w-10"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </button>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
                  Create New Bill
                </h2>
                <p
                  className="mt-1 truncate text-[11px] sm:text-xs"
                  style={{ color: "rgba(148,163,184,0.62)" }}
                >
                  Step {step + 1} of {STEPS.length} &mdash; {currentStep.title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={saveDraft}
              disabled={savingDraft}
              className="flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:text-sm xl:text-base font-medium transition-all text-xs"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(148,163,184,0.7)",
              }}
            >
              <Save className="h-3 w-3" />
              {savingDraft ? "Saving..." : "Draft"}
            </button>
          </div>

          {/* Step progress bar */}
          <div
            className="create-bill-progress relative z-10 border-b px-4 max-sm:pl-10 py-2 sm:py-3 md:px-6"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-0.5 overflow-x-auto overflow-y-hidden sm:gap-1">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex min-w-0 flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => handleGoToStep(i)}
                    className="flex min-w-0 shrink-0 items-center gap-1 md:gap-2"
                  >
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-medium transition-all duration-300 sm:h-6 sm:w-6 text-xs md:text-sm xl:text-base"
                      style={{
                        background:
                          step >= i
                            ? "rgba(56,189,248,0.15)"
                            : "rgba(255,255,255,0.04)",
                        border:
                          step >= i
                            ? "1px solid rgba(56,189,248,0.25)"
                            : "1px solid rgba(255,255,255,0.06)",
                        color: step >= i ? "#7dd3fc" : "rgba(148,163,184,0.4)",
                      }}
                    >
                      {step > i ? (
                        <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      ) : (
                        s.num
                      )}
                    </div>
                    <span
                      className="hidden truncate text-xs sm:text-sm xl:text-base font-medium sm:inline"
                      style={{
                        color:
                          step === i
                            ? "rgba(255,255,255,0.9)"
                            : step > i
                              ? "rgba(56,189,248,0.6)"
                              : "rgba(148,163,184,0.4)",
                      }}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div
                      className="mx-0.5 h-px min-w-[6px] flex-1 sm:mx-1"
                      style={{
                        background:
                          step > i
                            ? "rgba(56,189,248,0.25)"
                            : "rgba(255,255,255,0.05)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Wizard Body - only this scrolls */}
          <div className="create-bill-modal-body relative z-10 flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 sm:px-4 md:px-6 sm:py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <CustomerStep
                    formData={formData}
                    customers={customers}
                    customersLoading={customersLoading}
                    onInputChange={(field, value) =>
                      onInputChange(field, value)
                    }
                    autocompleteResetKey={autocompleteResetKey}
                  />
                )}
                {step === 1 && (
                  <ServicesStep
                    onAddCustomItem={addCustomItemToBill}
                    onServiceAdded={() => {}}
                    formData={formData}
                    onInputChange={(field, value) =>
                      onInputChange(field, value)
                    }
                  />
                )}
                {step === 2 && (
                  <BillItemsStep
                    selectedItems={selectedItems}
                    onUpdateQuantity={updateItemQuantity}
                    onRemoveItem={removeItem}
                    onClearAll={() =>
                      selectedItems
                        .filter((i: any) => i.itemType === "standard")
                        .forEach((i: any) => removeItem(i.id))
                    }
                    onOpenItemSelection={() => setItemModalOpen(true)}
                    onOpenManualItem={() => setManualItemModalOpen(true)}
                    categories={categories}
                  />
                )}
                {step === 3 && (
                  <PaymentStep
                    formData={formData}
                    selectedItems={selectedItems}
                    selectedCustomer={selectedCustomer}
                    onInputChange={onInputChange}
                    calculateGrandTotal={calculateGrandTotal}
                    calculateTotal={calculateTotal}
                    getPaymentDetails={getPaymentDetails}
                    onEditStep={handleGoToStep}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Wizard Footer - always visible */}
          <div
            className="create-bill-modal-footer sticky bottom-0 z-30 flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2.5 sm:px-6 sm:py-3"
            style={{
              borderColor: "rgba(255,255,255,0.06)",
              background: "rgba(15,23,42,0.65)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <div>
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handlePrev}
                  className="text-slate-300 gap-1 text-xs sm:text-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext()}
                  className="gap-1 text-xs sm:text-sm"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    opacity: canGoNext() ? 1 : 0.4,
                  }}
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e as any)}
                  disabled={isLoading}
                  className="gap-1 text-xs sm:text-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.15))",
                    border: "1px solid rgba(56,189,248,0.25)",
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isLoading ? "Creating..." : "Create Bill"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Floating Summary */}
      {showFloatingSummary && (
        <FloatingSummary
          selectedItems={selectedItems}
          formData={formData}
          calculateTotal={calculateTotal}
          calculateGrandTotal={calculateGrandTotal}
          getPaymentDetails={getPaymentDetails}
          onOpenPaymentStep={() => handleGoToStep(3)}
        />
      )}

      {/* Item Selection Modal */}
      <ItemSelectionModalV2
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        activeProducts={activeProducts}
        categories={categories}
        brands={brands}
        onAddItem={addItemToBill}
        selectedItems={selectedItems}
        onUpdateQuantity={updateItemQuantity}
        onRemoveItem={removeItem}
        onOpenManualItem={() => setManualItemModalOpen(true)}
        productsLoading={productsLoading}
      />

      {/* Manual Item Modal */}
      <ManualItemModal
        isOpen={manualItemModalOpen}
        onClose={() => {
          setManualItemModalOpen(false);
          setManualItem({
            productName: "",
            quantity: 1,
            unitPrice: 0,
            specifications: "",
            category: "",
            brand: "",
            unit: "pcs",
          });
        }}
        onAdd={(item) => {
          addCustomItemToBill(item);
          setManualItemModalOpen(false);
          setManualItem({
            productName: "",
            quantity: 1,
            unitPrice: 0,
            specifications: "",
            category: "",
            brand: "",
            unit: "pcs",
          });
        }}
        manualItem={manualItem}
        setManualItem={setManualItem}
      />
    </>
  );
}

/* Manual Item Modal */
function ManualItemModal({
  isOpen,
  onClose,
  onAdd,
  manualItem,
  setManualItem,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: any) => void;
  manualItem: any;
  setManualItem: (item: any) => void;
}) {
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!manualItem.productName.trim()) {
      setError("Product name is required");
      return;
    }
    if (!manualItem.unitPrice || manualItem.unitPrice <= 0) {
      setError("Price must be greater than 0");
      return;
    }
    onAdd(manualItem);
  };

  return (
    <div
      className="fixed inset-0 z-[290] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          background: "rgba(15,23,42,0.7)",
          backdropFilter: "blur(32px) saturate(160%)",
          WebkitBackdropFilter: "blur(32px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <h3 className="text-white font-semibold text-sm">Add Custom Item</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full"
            style={{ color: "rgba(148,163,184,0.5)" }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label
              className="text-xs font-medium mb-1.5 block"
              style={{ color: "rgba(148,163,184,0.7)" }}
            >
              Product Name *
            </label>
            <input
              type="text"
              value={manualItem.productName}
              onChange={(e) => {
                setError("");
                setManualItem({ ...manualItem, productName: e.target.value });
              }}
              placeholder="Enter product name"
              className="w-full text-white text-sm px-3 py-2 outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "rgba(148,163,184,0.7)" }}
              >
                Quantity
              </label>
              <input
                type="number"
                min={1}
                value={manualItem.quantity}
                onChange={(e) =>
                  setManualItem({
                    ...manualItem,
                    quantity: Number(e.target.value) || 1,
                  })
                }
                className="w-full text-white text-sm px-3 py-2 outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                }}
              />
            </div>
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "rgba(148,163,184,0.7)" }}
              >
                Unit Price (₹) *
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={manualItem.unitPrice}
                onChange={(e) => {
                  setError("");
                  setManualItem({
                    ...manualItem,
                    unitPrice: Number(e.target.value) || 0,
                  });
                }}
                className="w-full text-white text-sm px-3 py-2 outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "rgba(148,163,184,0.7)" }}
              >
                Category
              </label>
              <input
                type="text"
                value={manualItem.category}
                onChange={(e) =>
                  setManualItem({ ...manualItem, category: e.target.value })
                }
                placeholder="e.g. Accessories"
                className="w-full text-white text-sm px-3 py-2 outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                }}
              />
            </div>
            <div>
              <label
                className="text-xs font-medium mb-1.5 block"
                style={{ color: "rgba(148,163,184,0.7)" }}
              >
                Specifications
              </label>
              <input
                type="text"
                value={manualItem.specifications}
                onChange={(e) =>
                  setManualItem({
                    ...manualItem,
                    specifications: e.target.value,
                  })
                }
                placeholder="Color, wattage..."
                className="w-full text-white text-sm px-3 py-2 outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                }}
              />
            </div>
          </div>
          {error && (
            <p className="text-xs" style={{ color: "rgba(248,113,113,0.7)" }}>
              {error}
            </p>
          )}
        </div>
        <div
          className="px-5 py-3 border-t flex items-center justify-end gap-2"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "rgba(148,163,184,0.6)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-xl text-xs font-medium"
            style={{
              background: "rgba(56,189,248,0.15)",
              color: "rgba(56,189,248,0.9)",
              border: "1px solid rgba(56,189,248,0.2)",
            }}
          >
            Add Item
          </button>
        </div>
      </motion.div>
    </div>
  );
}
