"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BasicsStep } from "./basics-step";
import { PricingStep } from "./pricing-step";
import { StockStep } from "./stock-step";
import { MediaStep } from "./media-step";
import { validateProductStep } from "@/lib/inventory-helpers";
import type { InventoryFormData } from "@/hooks/use-multiple-inventory-form";
import type { ImageItem } from "@/components/inventory/product-image-upload";

const STEPS = [
  { num: 1, label: "Basics", title: "Product Basics" },
  { num: 2, label: "Pricing", title: "Pricing" },
  { num: 3, label: "Stock", title: "Stock" },
  { num: 4, label: "Media", title: "Media & Details" },
];

interface ProductWizardModalProps {
  isOpen: boolean;
  formData: InventoryFormData;
  errors: Record<string, string>;
  categories: { _id: string; name: string }[];
  brands: { _id: string; name: string }[];
  products: { _id: string; name: string; isActive: boolean }[];
  onClose: () => void;
  onSave: () => void;
  onSaveAndAdd: () => void;
  onInputChange: (field: string, value: string) => void;
  onImagesChange: (images: ImageItem[]) => void;
  onSpecificationChange: (
    field: string,
    value: string | number | boolean | string[],
  ) => void;
  onExistingProductSelect: (productId: string) => void;
  onClearError: (field: string) => void;
}

export function ProductWizardModal({
  isOpen,
  formData,
  errors,
  categories,
  brands,
  products,
  onClose,
  onSave,
  onSaveAndAdd,
  onInputChange,
  onImagesChange,
  onSpecificationChange,
  onExistingProductSelect,
  onClearError,
}: ProductWizardModalProps) {
  const [step, setStep] = useState(1);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const isDirty =
    formData.productName || formData.sellingPrice || formData.currentStock;

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const confirmClose = useCallback(() => {
    setShowUnsavedConfirm(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      setStep(1);
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleNext = () => {
    const stepErrors = validateProductStep(formData, step);
    if (Object.keys(stepErrors).length > 0) {
      for (const [field, msg] of Object.entries(stepErrors)) {
        onClearError(field);
        setTimeout(() => onInputChange("_error_" + field, msg), 0);
      }
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const isLastStep = step === 4;

  if (!isOpen) return null;

  const currentStep = STEPS.find((s) => s.num === step)!;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 md:p-6"
      onClick={handleBackdropClick}
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div
        ref={modalRef}
        className="relative flex flex-col w-full max-w-[900px] max-h-[90dvh] overflow-hidden rounded-3xl"
        style={{
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(32px) saturate(160%)",
          WebkitBackdropFilter: "blur(32px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.06), 0 25px 60px rgba(0,0,0,0.5)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Product Editor"
      >
        {/* Ambient glow */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(56,189,248,0.3), transparent)",
          }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full opacity-20 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.3), transparent)",
          }}
        />

        {/* Header */}
        <div
          className="relative z-10 flex-none px-4 sm:px-6 py-2 sm:py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-white truncate">
                {formData.productName || "New Product"}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {currentStep.title}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full transition-colors"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4 max-sm:pl-6">
            {STEPS.map((s) => (
              <div key={s.num} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5 justify-center">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300"
                    style={{
                      background:
                        step >= s.num
                          ? "rgba(56,189,248,0.2)"
                          : "rgba(255,255,255,0.05)",
                      border:
                        step >= s.num
                          ? "1px solid rgba(56,189,248,0.3)"
                          : "1px solid rgba(255,255,255,0.08)",
                      color:
                        step >= s.num ? "#7dd3fc" : "rgba(148,163,184,0.6)",
                    }}
                  >
                    {s.num}
                  </div>
                  <span
                    className="hidden sm:inline text-xs font-medium"
                    style={{
                      color:
                        step >= s.num
                          ? "rgba(255,255,255,0.8)"
                          : "rgba(148,163,184,0.5)",
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {s.num < 4 && (
                  <div
                    className="flex-1 h-px mx-1"
                    style={{
                      background:
                        step > s.num
                          ? "rgba(56,189,248,0.3)"
                          : "rgba(255,255,255,0.06)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Unsaved changes confirmation */}
        {showUnsavedConfirm && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center p-6"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              className="rounded-2xl p-6 max-w-sm w-full"
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-white font-medium">Unsaved Changes</h3>
              </div>
              <p className="text-sm text-slate-300 mb-5">
                You have unsaved changes. Are you sure you want to close?
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setShowUnsavedConfirm(false)}
                  className="text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmClose}
                  className="bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
                >
                  Discard
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-5 glass-modal-scroll">
          <div className="max-w-2xl mx-auto">
            {step === 1 && (
              <BasicsStep
                formData={formData}
                errors={errors}
                categories={categories}
                brands={brands}
                products={products}
                onInputChange={onInputChange}
                onExistingProductSelect={onExistingProductSelect}
                onSpecificationChange={onSpecificationChange}
              />
            )}
            {step === 2 && (
              <PricingStep
                formData={formData}
                errors={errors}
                onInputChange={onInputChange}
              />
            )}
            {step === 3 && (
              <StockStep
                formData={formData}
                errors={errors}
                onInputChange={onInputChange}
              />
            )}
            {step === 4 && (
              <MediaStep
                formData={formData}
                errors={errors}
                onInputChange={onInputChange}
                onImagesChange={onImagesChange}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="relative z-10 flex-none px-4 sm:px-6 py-1 sm:py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="text-slate-300 gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLastStep ? (
              <>
                <Button
                  type="button"
                  onClick={onSave}
                  className="gap-1.5"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(139,92,246,0.15))",
                    border: "1px solid rgba(56,189,248,0.25)",
                  }}
                >
                  <Save className="w-4 h-4" />
                  Save Product
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onSaveAndAdd}
                  className="gap-1.5 text-slate-300"
                >
                  <Plus className="w-4 h-4" />
                  Save & Add
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
