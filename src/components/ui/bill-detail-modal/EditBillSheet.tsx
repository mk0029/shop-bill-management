"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Package,
  Receipt,
  Percent,
  CreditCard,
  Eye,
  Save,
  X,
  MoreHorizontal,
  User,
  Copy,
  MessageSquare,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaseGlassModal } from "@/components/ui/base-glass-modal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface EditBillSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  onSave: (updatedBill: any) => void;
}

const steps = [
  { id: "items", label: "Items", icon: Package },
  { id: "charges", label: "Charges", icon: Receipt },
  { id: "discount", label: "Discount", icon: Percent },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review & Save", icon: Eye },
];

interface FormState {
  items: Array<{ name: string; qty: number; price: number }>;
  charges: Array<{ label: string; amount: number }>;
  discount: number;
  paymentStatus: string;
  paidAmount: number;
  notes: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
}

const emptyFormState: FormState = {
  items: [],
  charges: [
    { label: "Visiting Charges", amount: 0 },
    { label: "Transportation Fee", amount: 0 },
    { label: "Repair Charges", amount: 0 },
  ],
  discount: 0,
  paymentStatus: "pending",
  paidAmount: 0,
  notes: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
};

const toNum = (v: any): number => {
  if (typeof v === "number" && isFinite(v)) return v;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

function mapBillToEditFormState(bill: any): FormState {
  if (!bill) return { ...emptyFormState };

  return {
    items: (bill?.items || []).map((i: any) => ({
      name: i.name || i.productName || "",
      qty: toNum(i.qty || i.quantity || 1),
      price: toNum(i.price || i.rate || i.unitPrice || 0),
    })),
    charges: [
      {
        label: "Visiting Chargeses",
        amount: toNum(bill?.visitingCharges || bill?.visitFee || 0),
      },
      {
        label: "Transportation Fee",
        amount: toNum(bill?.transportationFee || bill?.transportFee || 0),
      },
      {
        label: "Repair Charges",
        amount: toNum(bill?.repairFee || bill?.repairCharges || 0),
      },
    ],
    discount: toNum(bill?.discount || 0),
    paymentStatus: bill?.paymentStatus || "pending",
    paidAmount: toNum(bill?.paidAmount || 0),
    notes: bill?.notes || bill?.adminNotes || "",
    customerName: bill?.customer?.name || bill?.customerName || "",
    customerPhone: bill?.customer?.phone || bill?.customerPhone || "",
    customerEmail: bill?.customer?.email || bill?.customerEmail || "",
    customerAddress:
      bill?.customer?.address ||
      bill?.customer?.location ||
      bill?.customerAddress ||
      "",
  };
}

export const EditBillSheet = memo(function EditBillSheet({
  isOpen,
  onClose,
  bill,
  onSave,
}: EditBillSheetProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>(() =>
    mapBillToEditFormState(bill),
  );
  const [hydrated, setHydrated] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const lastBillIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      lastBillIdRef.current = null;
      setHydrated(false);
      setLoadError(null);
      setShowSuccess(false);
      setCurrentStep(0);
      setEditingCustomer(false);
      setForm({ ...emptyFormState });
      return;
    }

    const billId = bill?._id || bill?.id || bill?.billId;
    if (!billId) {
      setLoadError("No bill data available");
      setHydrated(true);
      return;
    }

    if (lastBillIdRef.current === billId && hydrated) return;

    setHydrating(true);
    setLoadError(null);

    const timeout = setTimeout(() => {
      try {
        const mapped = mapBillToEditFormState(bill);
        setForm(mapped);
        lastBillIdRef.current = billId;
        setHydrated(true);
      } catch (err) {
        console.error("[EditBillSheet] hydration failed:", err);
        setLoadError("Failed to load bill data. Please try again.");
      } finally {
        setHydrating(false);
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [isOpen, bill?._id, bill, hydrated]);

  const handleRetry = useCallback(() => {
    setHydrated(false);
    setLoadError(null);
    lastBillIdRef.current = null;
  }, []);

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const billId = bill?._id || bill?.id || bill?.billId;
      const itemTotal = form.items.reduce((s, i) => s + i.qty * i.price, 0);
      const chargeTotal = form.charges.reduce((s, c) => s + c.amount, 0);
      const grandTotal = Math.max(0, itemTotal + chargeTotal - form.discount);
      const balanceAmount = Math.max(0, grandTotal - form.paidAmount);

      const updated: Record<string, any> = {
        items: form.items.map((i) => ({
          productName: i.name,
          quantity: i.qty,
          unitPrice: i.price,
          totalPrice: i.qty * i.price,
        })),
        visitingCharges: form.charges[0]?.amount || 0,
        transportationFee: form.charges[1]?.amount || 0,
        repairFee: form.charges[2]?.amount || 0,
        subtotal: itemTotal,
        totalAmount: grandTotal,
        discount: form.discount,
        paidAmount: form.paidAmount,
        balanceAmount,
        paymentStatus: form.paymentStatus,
        notes: form.notes,
      };

      if (editingCustomer) {
        updated.customerName = form.customerName;
        updated.customerPhone = form.customerPhone;
        updated.customerEmail = form.customerEmail;
        updated.customerAddress = form.customerAddress;
      }

      await onSave({ _id: billId, ...updated });
      setShowSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error("[EditBillSheet] save failed:", err);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [bill, form, onSave, onClose, editingCustomer]);

  const itemTotal = form.items.reduce((s, i) => s + i.qty * i.price, 0);
  const chargeTotal = form.charges.reduce((s, c) => s + c.amount, 0);
  const grandTotal = Math.max(0, itemTotal + chargeTotal - form.discount);

  const customer = bill?.customer || {};
  const cName =
    customer?.name || bill?.customerName || form.customerName || "Unknown";
  const cPhone =
    customer?.phone || bill?.customerPhone || form.customerPhone || "";
  const cAddress =
    customer?.address || customer?.location || bill?.customerAddress || "";

  const customerMenuItems = [
    {
      label: "Edit Customer Details",
      icon: User,
      onClick: () => {
        setEditingCustomer(true);
        setShowCustomerMenu(false);
      },
    },
    {
      label: "View Customer",
      icon: ExternalLink,
      onClick: () => {
        const cid = customer?._id || customer?.customerId;
        if (cid)
          router.push(
            `/admin/customers?customerId=${encodeURIComponent(cid)}&modal=customerDetails`,
          );
        setShowCustomerMenu(false);
      },
    },
    {
      label: "Copy Number",
      icon: Copy,
      onClick: () => {
        if (cPhone && navigator.clipboard) {
          navigator.clipboard.writeText(cPhone);
          toast.success("Phone copied");
        }
        setShowCustomerMenu(false);
      },
    },
    {
      label: "WhatsApp Customer",
      icon: MessageSquare,
      onClick: () => {
        if (cPhone)
          window.open(
            `https://wa.me/91${cPhone.replace(/\D/g, "").slice(-10)}`,
            "_blank",
          );
        setShowCustomerMenu(false);
      },
    },
  ];

  const renderLoadingSkeleton = () => (
    <div className="space-y-4 py-6">
      {[1, 2, 3].map((n) => (
        <div key={n} className="glass-card-static p-5 space-y-3">
          <div className="h-4 bg-white/[0.06] rounded-lg w-1/3 animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded-lg w-full animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded-lg w-2/3 animate-pulse" />
        </div>
      ))}
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Failed to Load Bill
      </h3>
      <p className="text-sm text-white/50 mb-5 max-w-xs">{loadError}</p>
      <Button
        onClick={handleRetry}
        className="!rounded-xl bg-white/[0.08] border border-white/10 text-white hover:bg-white/[0.12]"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry
      </Button>
    </div>
  );

  return (
    <BaseGlassModal
      isOpen={isOpen}
      onClose={() => {
        setEditingCustomer(false);
        onClose();
      }}
      title={showSuccess ? undefined : steps[currentStep].label}
      size="xl"
      zIndex={350}
      showCloseButton={!showSuccess}
      mobileType="bottom-sheet"
    >
      {showSuccess ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mb-5">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Bill Updated!</h2>
        </div>
      ) : loadError ? (
        renderError()
      ) : !hydrated || hydrating ? (
        renderLoadingSkeleton()
      ) : (
        <>
          {/* Fixed Customer Summary */}
          <div className="sticky top-0 z-20 -mx-5 -mt-4 pt-4 pb-3 px-5 border-b border-white/[0.06] shrink-0 bg-white/[0.02] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400/30 to-violet-500/30 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white/80">
                    {cName
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {cName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    {cPhone && <span>{cPhone}</span>}
                    {cAddress && (
                      <>
                        <span className="text-white/20">|</span>
                        <span className="truncate">{cAddress}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowCustomerMenu((p) => !p)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {showCustomerMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1 p-1.5 rounded-xl bg-slate-900 border border-white/10 shadow-2xl shadow-black/40 min-w-[180px] space-y-0.5 z-50"
                    >
                      {customerMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            onClick={item.onClick}
                            className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-all"
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {item.label}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              {editingCustomer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3 pt-3 border-t border-white/[0.06] space-y-2"
                >
                  <EditCustomerFields
                    name={form.customerName}
                    phone={form.customerPhone}
                    email={form.customerEmail}
                    address={form.customerAddress}
                    onChange={(key, val) =>
                      updateField(key as keyof FormState, val)
                    }
                  />
                  <button
                    onClick={() => setEditingCustomer(false)}
                    className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
                  >
                    Done editing customer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 mt-2 text-[11px] text-white/30">
              <span>#{bill?.billNumber || bill?._id?.slice(-6) || "N/A"}</span>
              <span className="text-white/20">|</span>
              <span
                className={cn(
                  "capitalize",
                  bill?.paymentStatus === "paid"
                    ? "text-emerald-400/70"
                    : bill?.paymentStatus === "partial"
                      ? "text-amber-400/70"
                      : "text-sky-400/70",
                )}
              >
                {bill?.paymentStatus || "pending"}
              </span>
            </div>
          </div>

          {/* Steps indicator */}
          <div className="sticky top-[auto] z-10 flex items-center gap-1 py-3 border-b border-white/[0.06] shrink-0 overflow-x-auto no-scrollbar">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = i === currentStep;
              const isComplete = i < currentStep;
              return (
                <div key={step.id} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setCurrentStep(i)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                      isActive
                        ? "bg-sky-500/15 text-sky-300 border border-sky-500/25"
                        : isComplete
                          ? "bg-emerald-500/10 text-emerald-300/70"
                          : "bg-white/[0.03] text-white/30",
                    )}
                  >
                    {isComplete ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <StepIcon className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                  </button>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "w-4 h-px",
                        i < currentStep ? "bg-emerald-500/30" : "bg-white/10",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="space-y-5 min-w-0 pb-4">
            <EditStepContent
              step={currentStep}
              form={form}
              updateField={updateField}
              bill={bill}
              itemTotal={itemTotal}
              chargeTotal={chargeTotal}
              grandTotal={grandTotal}
            />
          </div>

          {/* Footer */}
          <div
            className="sticky bottom-0 z-20 shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-t border-white/[0.08] bg-white/[0.02] backdrop-blur-xl -mx-5 -mb-4 mt-auto"
            style={{
              paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <Button
              variant="outline"
              onClick={() => {
                setEditingCustomer(false);
                onClose();
              }}
              className="!rounded-xl border-white/10 text-white/50"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  onClick={handlePrev}
                  className="!rounded-xl bg-white/[0.08] border border-white/10 text-white hover:bg-white/[0.12]"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              {currentStep < steps.length - 1 && (
                <Button
                  onClick={handleNext}
                  className="!rounded-xl bg-white/[0.08] border border-white/10 text-white hover:bg-white/[0.12]"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {currentStep === steps.length - 1 && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="!rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white border-0"
                >
                  {isSaving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-1.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </BaseGlassModal>
  );
});

function EditCustomerFields({
  name,
  phone,
  email,
  address,
  onChange,
}: {
  name: string;
  phone: string;
  email: string;
  address: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-[10px] text-white/40 mb-1 block">Name</label>
        <input
          value={name}
          onChange={(e) => onChange("customerName", e.target.value)}
          className="w-full glass-input !p-2 text-xs text-white"
        />
      </div>
      <div>
        <label className="text-[10px] text-white/40 mb-1 block">Phone</label>
        <input
          value={phone}
          onChange={(e) => onChange("customerPhone", e.target.value)}
          className="w-full glass-input !p-2 text-xs text-white"
        />
      </div>
      <div>
        <label className="text-[10px] text-white/40 mb-1 block">Email</label>
        <input
          value={email}
          onChange={(e) => onChange("customerEmail", e.target.value)}
          className="w-full glass-input !p-2 text-xs text-white"
        />
      </div>
      <div>
        <label className="text-[10px] text-white/40 mb-1 block">Address</label>
        <input
          value={address}
          onChange={(e) => onChange("customerAddress", e.target.value)}
          className="w-full glass-input !p-2 text-xs text-white"
        />
      </div>
    </div>
  );
}

function EditStepContent({
  step,
  form,
  updateField,
  bill,
  itemTotal,
  chargeTotal,
  grandTotal,
}: {
  step: number;
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  bill: any;
  itemTotal: number;
  chargeTotal: number;
  grandTotal: number;
}) {
  switch (step) {
    case 0:
      return (
        <div className="glass-card-static p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">Bill Items</h3>
          <div className="glass-divider" />
          {form.items.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-4">
              No items in this bill
            </p>
          ) : (
            form.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[i] = { ...items[i], name: e.target.value };
                    updateField("items", items);
                  }}
                  placeholder="Item name"
                  className="flex-1 glass-input !p-2.5 text-sm text-white"
                />
                <input
                  type="number"
                  value={item.qty}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[i] = {
                      ...items[i],
                      qty: Math.max(1, Number(e.target.value)),
                    };
                    updateField("items", items);
                  }}
                  placeholder="Qty"
                  className="w-16 glass-input !p-2.5 text-sm text-white text-center"
                  min="1"
                />
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => {
                    const items = [...form.items];
                    items[i] = {
                      ...items[i],
                      price: Math.max(0, Number(e.target.value)),
                    };
                    updateField("items", items);
                  }}
                  placeholder="Price"
                  className="w-24 glass-input !p-2.5 text-sm text-white text-right"
                  min="0"
                />
                <button
                  onClick={() =>
                    updateField(
                      "items",
                      form.items.filter((_, idx) => idx !== i),
                    )
                  }
                  className="p-2 text-white/30 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
          <button
            onClick={() =>
              updateField("items", [
                ...form.items,
                { name: "", qty: 1, price: 0 },
              ])
            }
            className="w-full py-2 rounded-xl border border-dashed border-white/[0.08] text-sm text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-all"
          >
            + Add Item
          </button>
        </div>
      );

    case 1:
      return (
        <div className="glass-card-static p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">
            Additional Charges
          </h3>
          <div className="glass-divider" />
          {form.charges.map((charge, i) => (
            <div key={charge.label} className="flex items-center gap-3">
              <span className="text-sm text-white/60 min-w-[140px]">
                {charge.label}
              </span>
              <span className="text-white/30">₹</span>
              <input
                type="number"
                value={charge.amount}
                onChange={(e) => {
                  const charges = [...form.charges];
                  charges[i] = {
                    ...charges[i],
                    amount: Math.max(0, Number(e.target.value)),
                  };
                  updateField("charges", charges);
                }}
                className="flex-1 glass-input !p-2.5 text-sm text-white text-right"
                min="0"
              />
            </div>
          ))}
        </div>
      );

    case 2:
      return (
        <div className="glass-card-static p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">Discount</h3>
          <div className="glass-divider" />
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-lg">₹</span>
            <input
              type="number"
              value={form.discount}
              onChange={(e) =>
                updateField("discount", Math.max(0, Number(e.target.value)))
              }
              className="flex-1 glass-input !p-3 text-lg font-bold text-white text-right"
              min="0"
              placeholder="0"
            />
          </div>
          {form.discount > 0 && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Subtotal</span>
                <span className="text-white/80">₹{itemTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-white/60">Charges</span>
                <span className="text-white/80">₹{chargeTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-emerald-400">Discount</span>
                <span className="text-emerald-400">
                  -₹{form.discount.toFixed(2)}
                </span>
              </div>
              <div className="glass-divider my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white/80">
                  Payable
                </span>
                <span className="text-lg font-bold text-amber-300">
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      );

    case 3:
      return (
        <div className="glass-card-static p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">Payment</h3>
          <div className="glass-divider" />
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">
              Payment Status
            </label>
            <select
              value={form.paymentStatus}
              onChange={(e) => updateField("paymentStatus", e.target.value)}
              className="w-full glass-input !p-3 text-sm text-white"
            >
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <Field
            label="Amount Paid (₹)"
            value={String(form.paidAmount)}
            onChange={(v) => updateField("paidAmount", Math.max(0, Number(v)))}
            type="number"
          />
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">
              Admin Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={3}
              className="w-full glass-input !p-3 text-sm text-white resize-none"
              placeholder="Add notes about this bill..."
            />
          </div>
        </div>
      );

    case 4:
      return (
        <div className="glass-card-static p-5 space-y-4">
          <h3 className="text-base font-semibold text-white">Review Changes</h3>
          <div className="glass-divider" />
          <div className="grid grid-cols-2 gap-4">
            <ReviewField label="Customer" value={form.customerName} />
            <ReviewField label="Phone" value={form.customerPhone} />
          </div>
          <div className="glass-divider" />
          <div className="space-y-1.5">
            <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
              Items
            </span>
            {form.items.length === 0 ? (
              <p className="text-xs text-white/30">No items</p>
            ) : (
              form.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white/60">
                    {item.name} × {item.qty}
                  </span>
                  <span className="text-white/80">
                    ₹{(item.qty * item.price).toFixed(2)}
                  </span>
                </div>
              ))
            )}
            <div className="flex justify-between text-sm pt-1 border-t border-white/[0.06]">
              <span className="text-white/50">Subtotal</span>
              <span className="text-white font-medium">
                ₹{itemTotal.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="glass-divider" />
          <div className="space-y-1.5">
            {form.charges.map((c) => (
              <div key={c.label} className="flex justify-between text-sm">
                <span className="text-white/60">{c.label}</span>
                <span className="text-white/80">₹{c.amount.toFixed(2)}</span>
              </div>
            ))}
            {form.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-400">Discount</span>
                <span className="text-emerald-400">
                  -₹{form.discount.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div className="glass-divider" />
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-white">
              Grand Total
            </span>
            <span className="text-lg font-bold text-amber-300">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Paid</span>
            <span className="text-emerald-400">
              ₹{form.paidAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Balance</span>
            <span className="text-amber-300">
              ₹{Math.max(0, grandTotal - form.paidAmount).toFixed(2)}
            </span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-white/40 mb-1.5 block">{label}</label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full glass-input !p-3 text-sm text-white"
      />
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-white/40 block">{label}</span>
      <span className="text-sm text-white/80">{value || "—"}</span>
    </div>
  );
}
