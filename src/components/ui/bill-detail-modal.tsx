/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { useState } from "react";
import { useRouter } from "next/navigation";
// Switch not needed after redesign of payment UI
import { BillDetails, shareBillOnWhatsApp, shareBillViaSMS } from "@/lib/whatsapp-share";
import { useLocaleStore } from "@/store/locale-store";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CreditCard,
  Edit3,
  FileText,
  MapPin,
  Save,
  Share2,
  MessageSquare,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface BillDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any;
  onDownloadPDF?: (bill: any) => void;
  onUpdatePayment?: (
    billId: string,
    paymentData: {
      paymentStatus: "pending" | "partial" | "paid";
      paidAmount: number;
      balanceAmount: number;
      discountAmount?: number;
    }
  ) => Promise<void>;
  showShareButton?: boolean;
  showPaymentControls?: boolean;
}

export const BillDetailModal = ({
  isOpen,
  onClose,
  bill,
  onDownloadPDF,
  onUpdatePayment,
  showShareButton = true,
  showPaymentControls = true,
}: BillDetailModalProps) => {
  const router = useRouter();
  const { currency } = useLocaleStore();

  // Payment state management (redesigned)
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"paid" | "partial">("partial");
  const [partialAmount, setPartialAmount] = useState("");
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [discountValue, setDiscountValue] = useState<string>(String((bill as any)?.discountAmount || 0));

  if (!bill) return null;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-900 text-green-300 border-green-700";
      case "partial":
        return "bg-orange-900 text-orange-300 border-orange-700";
      case "pending":
        return "bg-yellow-900 text-yellow-300 border-yellow-700";
      case "overdue":
        return "bg-red-900 text-red-300 border-red-700";
      default:
        return "bg-gray-900 text-gray-300 border-gray-700";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const itemsTotal =
    bill.items?.reduce(
      (total: number, item: any) => total + (item.totalPrice || 0),
      0
    ) || 0;

  // Helper to coerce possibly string numeric fields to number
  const toNum = (v: any): number => {
    if (typeof v === "number" && isFinite(v)) return v;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Normalize charge fields to numbers and coalesce keys
  const transportationFee = toNum(bill.transportationFee);
  const homeVisitFee = toNum(bill.homeVisitFee);
  const laborCharges = toNum(bill.laborCharges);
  const repairChargeValue = toNum(
    bill.repairCharges ?? bill.repairFee ?? (bill as any).repairCharge ?? 0
  );

  const additionalCharges =
    homeVisitFee + transportationFee + repairChargeValue + laborCharges;

  // Show Additional Charges section if any charge field is present on the bill
  const hasAnyCharge =
    bill.homeVisitFee !== undefined ||
    bill.transportationFee !== undefined ||
    bill.repairCharges !== undefined ||
    (bill as any).repairCharge !== undefined ||
    bill.repairFee !== undefined ||
    bill.laborCharges !== undefined;

  // Prefer explicit totals from bill to match list cards
  const explicitTotal = toNum((bill as any).totalAmount ?? (bill as any).total);
  const discountAmount = toNum(discountValue || (bill as any).discountAmount || 0);
  const preDiscountTotal = itemsTotal + additionalCharges;
  const computedTotal = Math.max(0, preDiscountTotal - discountAmount);
  const grandTotal = explicitTotal > 0 ? explicitTotal : computedTotal;
  const alreadyPaidView = toNum(bill.paidAmount || 0);
  const maxBalance = Math.max(0, grandTotal - alreadyPaidView);
  // Dynamic cap: discount cannot exceed remaining pending after applying the entered payment
  const partialNum = Math.max(Number(partialAmount || 0), 0);
  const dynamicMaxDiscount = Math.max(0, preDiscountTotal - alreadyPaidView - partialNum);
  // Live preview numbers with current inputs
  const newPaidPreview = Math.min(alreadyPaidView + partialNum, grandTotal);
  const newPendingPreview = Math.max(0, grandTotal - newPaidPreview);
  // Payment calculation logic
  const calculatePaymentDetails = () => {
    const alreadyPaid = toNum(bill.paidAmount || 0);
    if (paymentMode === "paid") {
      return {
        paymentStatus: "paid" as const,
        paidAmount: grandTotal,
        balanceAmount: 0,
      };
    }
    if (paymentMode === "partial" && partialAmount) {
      const add = Math.max(Number(partialAmount), 0);
      const newPaid = Math.min(alreadyPaid + add, grandTotal);
      const balanceAmount = Math.max(0, grandTotal - newPaid);
      return {
        paymentStatus: balanceAmount > 0 ? ("partial" as const) : ("paid" as const),
        paidAmount: newPaid,
        balanceAmount,
      };
    }
    // If no partial amount entered, but discount reduces balance to 0, allow save to mark paid
    if (paymentMode === "partial") {
      const balanceAmount = Math.max(0, grandTotal - alreadyPaid);
      if (balanceAmount <= 0) {
        return {
          paymentStatus: "paid" as const,
          paidAmount: alreadyPaid,
          balanceAmount: 0,
        };
      }
    }
    return null;
  };

  // Handle payment update
  const handlePaymentUpdate = async () => {
    if (!onUpdatePayment) return;
    const paymentDetails = calculatePaymentDetails();
    if (!paymentDetails) return;
    setIsUpdatingPayment(true);
    try {
      await onUpdatePayment(bill._id || bill.id, { ...paymentDetails, discountAmount: toNum(discountValue) });
      // Removed forced global refetch; rely on optimistic update + realtime
      if (bill) {
        bill.paymentStatus = paymentDetails.paymentStatus;
        bill.paidAmount = paymentDetails.paidAmount;
        bill.balanceAmount = paymentDetails.balanceAmount;
        (bill as any).discountAmount = toNum(discountValue);
      }
      setIsEditingPayment(false);
      setPaymentMode("partial");
      setPartialAmount("");
      const isFull = paymentDetails.paymentStatus === "paid";
      const added = Math.max(Number(partialAmount || 0), 0);
      toast.success(
        isFull
          ? "✅ Bill marked as fully paid!"
          : `✅ Payment of ₹${added.toFixed(2)} recorded successfully!`
      );
      onClose();
    } catch (error) {
      console.error("Failed to update payment:", error);
      toast.error("❌ Failed to update payment. Please try again.");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Directly mark as fully paid helper
  const handleMarkAsPaid = async () => {
    if (!onUpdatePayment) return;
    // Force paid mode calculation regardless of current input
    const target = {
      paymentStatus: "paid" as const,
      paidAmount: grandTotal,
      balanceAmount: 0,
    };
    setIsUpdatingPayment(true);
    try {
      await onUpdatePayment(bill._id || bill.id, { ...target, discountAmount: toNum(discountValue) });
      if (bill) {
        bill.paymentStatus = target.paymentStatus;
        bill.paidAmount = target.paidAmount;
        bill.balanceAmount = target.balanceAmount;
        (bill as any).discountAmount = toNum(discountValue);
      }
      setIsEditingPayment(false);
      setPaymentMode("partial");
      setPartialAmount("");
      toast.success("✅ Bill marked as fully paid!");
      onClose();
    } catch (error) {
      console.error("Failed to mark as paid:", error);
      toast.error("❌ Failed to update payment. Please try again.");
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  // Quick amount helpers removed per UX request

  // Reset payment state when modal closes
  const handleClose = () => {
    setIsEditingPayment(false);
    setPaymentMode("partial");
    setPartialAmount("");
    onClose();
  };
  const getCustomerId = (c: any) => (typeof c === "string" ? c : c?._id || c?._ref);
  const resolveCustomerIdFromBill = (b: any) => {
    const c = b?.customer;
    if (typeof c === "string" && c) return c;
    const direct = c?._id || c?.id || c?._ref;
    if (direct) return direct;
    const viaField = b?.customerId || b?.customer_id || b?.customerRef || b?.customer_ref;
    return viaField || null;
  };
  const additionalChargesF = [
    {
      label: "Transportation Fee",
      value: transportationFee,
    },
    {
      label: "Home Visit Fee",
      value: homeVisitFee,
    },
    {
      label: "Repair Charges",
      value: repairChargeValue,
    },
    {
      label: "Labor Charges",
      value: laborCharges,
    },
  ];
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="relative">
        <div className="space-y-6 max-md:space-y-3 md:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-base sm:text-base md:text-lg lg:text-2xl xl:text-3xl font-bold text-white mb-3 text-ellipsis max-sm:max-w-[78%] max-w-full whitespace-nowrap overflow-hidden">
                Bill #{bill.billNumber || bill._id}
              </h2>

              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Date: {formatDate(bill.serviceDate || bill.createdAt)}
                  
                  </span>
                </div>

                {bill.serviceType && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Service: {bill.serviceType}</span>
                  </div>
                )}

                {bill.locationType && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>Location: {bill.locationType}</span>
                  </div>
                )}
                {bill.technician?.name && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Technician: {bill.technician.name}</span>
                  </div>
                )}
              </div>
            </div>

            <Badge
              className={`${getStatusColor(bill.paymentStatus || bill.status)} px-2 py-0.5 text-xs font-medium max-sm:absolute max-sm:-right-1 max-sm:top-0 z-10`}>
              {(bill.paymentStatus || bill.status || "pending").toUpperCase()}
            </Badge>
          </div>

          {/* Customer Info */}
          {bill.customer && (
            <div className="bg-gray-800/50 rounded-lg p-2 sm:p-4 border border-gray-700">
             
              <div className="text-sm text-gray-300 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">  <p className="font-medium">{bill.customer.name}</p>
                {bill.customer.phone && (
                  <p className="text-gray-400">{bill.customer.phone}</p>
                )}</div>
                {bill.customer.email && (
                  <p className="text-gray-400">{bill.customer.email}</p>
                )}
                {(bill.customerAddress || bill.customer.location) && (
                  <p className="text-gray-400">
                    {bill.customerAddress?.addressLine1 ||
                      bill.customer.location}
                    {bill.customerAddress?.city &&
                      `, ${bill.customerAddress.city}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Items */}
          {bill.items && bill.items.length > 0 && (
            <div>
              <h3 className="font-medium text-white mb-2 sm:mb-3 md:mb-4">Items</h3>
              <div className="space-y-3">
                {bill.items.map((item: any, index: number) => {
                  return (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex-1">
                       <div className="flex items-center gap-2 justify-between flex-wrap"> <p className="font-medium text-white mb-1">
                          {item?.product?.name || item.name || "Unknown Item"}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {/* {item.brand && (
                          <Badge
                            variant="outline"
                            className="text-blue-400 border-blue-600">
                            {item.brand}
                          </Badge>
                        )} */}
                          {item.category && (
                            <Badge
                              variant="outline"
                              className="text-purple-400 border-purple-600 max-sm:!py-0.5 max-sm:px-2 max-sm:text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </div></div>
                        {item.specifications && (
                          <p className="text-sm text-gray-400 mb-2">
                            {item.specifications}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-400">
                          <span>
                            Qty: {item.quantity} {item.unit || "piece"}
                          </span>
                          <span>
                            Unit Price: {currency}
                            {(item.unitPrice || item.price || 0).toFixed(2)}
                          </span>
                          {item.discount > 0 && (
                            <span className="text-green-400">
                              Discount: {currency}
                              {item.discount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white text-base md:text-lg">
                          {currency}
                          {(item.totalPrice || item.total || 0).toFixed(2)}
                        </p>
                      </div>
                      {item.productDetails && (
                        <p className="text-sm text-gray-200 capitalize">
                          {Object.entries(
                            item.productDetails.specifications || {}
                          )
                            .filter(
                              ([_, value]) =>
                                value !== undefined &&
                                value !== null &&
                                value !== ""
                            )
                            .map(([key, value]) => {
                              // 1️⃣ Format camelCase / PascalCase into spaced words
                              let formattedKey = key.replace(
                                /([a-z])([A-Z])/g,
                                "$1 $2"
                              );

                              // 2️⃣ Split into words, remove "is", capitalize each
                              formattedKey = formattedKey
                                .split(" ")
                                .filter((word) => word.toLowerCase() !== "is")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                )
                                .join(" ");

                              // 3️⃣ Convert boolean strings to Yes/No
                              if (String(value).toLowerCase() === "true")
                                value = "Yes";
                              else if (String(value).toLowerCase() === "false")
                                value = "No";

                              return `${formattedKey}: ${value}`;
                            })
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Charges */}
          {hasAnyCharge && (
            <div>
              <h3 className="font-medium text-white mb-2 sm:mb-3 md:mb-4">
                Additional Charges
              </h3>
              <div className="space-y-3">
                {additionalChargesF?.map(
                  (charge, index) =>
                    charge.value > 0 && (
                      <div
                        key={index}
                        className="flex justify-between items-center py-1.5 px-2 sm:p-3 bg-gray-800/50 rounded-lg border border-gray-700 sm:text-base text-sm">
                        <span className="text-gray-300">{charge.label}</span>
                        <span className="font-medium text-white">
                          {currency}
                          {charge.value.toFixed(2)}
                        </span>
                      </div>
                    )
                )}
              </div>
            </div>
          )}

          {/* Total Section */}
          <div className="border-t border-gray-700 pt-3 sm:pt-4 md:pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-base sm:text-lg md:text-xl font-bold">
                <span className="text-white">Total Amount</span>
                <span className="text-white">
                  {currency}
                  {/* {grandTotal <= 0
                    ? grandTotal.toFixed(2)
                    : bill.balanceAmount?.toFixed(2)} */}
                  {grandTotal?.toFixed(2) || bill?.balanceAmount}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300">Discount</span>
                  <span className="text-green-400">-
                    {currency}
                    {discountAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <AnimatePresence>
                {bill.paymentStatus === "partial" && (
                  <motion.div
                    key="partial-status-breakdown"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="space-y-1 sm:space-y-2 pt-2 border-t border-gray-800"
                  >
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-green-400">Paid Amount</span>
                      <span className="text-green-400 font-medium">
                        {currency}
                        {(toNum(bill.paidAmount || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-orange-400">Pending Amount</span>
                      <span className="text-orange-400 font-medium">
                        {currency}
                        {(bill.balanceAmount || (grandTotal - (bill.paidAmount || 0))).toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Notes */}
          {bill.notes && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="font-medium text-white mb-2">Notes</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {bill.notes}
              </p>
            </div>
          )}

          {/* Payment Controls */}
          {showPaymentControls &&
            onUpdatePayment &&
            bill.paymentStatus !== "paid" && (
              <div className="bg-gray-800/50 rounded-lg p-2 sm:py-2 sm:px-3 border border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Update Payment
                  </h3>
                  {!isEditingPayment && (
                 <button onClick={() => setIsEditingPayment(true)} className="text-sm font-normal leading-none p-2 rounded-md border border-solid border-slate-300"><Edit3 className="size-3 md:size-4" /></button>
                  )}
                </div>

                {isEditingPayment && (
          <div className="space-y-4">
               
                    <div className="flex gap-2 items-center mt-2">
                     <p className="text-base font-normal leading-none">Mark Full Paid</p>
                      <div   onClick={() => setPaymentMode(paymentMode === "paid" ? "partial" : "paid")} className={`w-10 h-6 cursor-pointer rounded-full border border-solid  relative ${paymentMode === "paid" ? "border-green-300" : "border-slate-300"}`}>
                        <div className={`w-4 h-4 transition-all ease-linear duration-100 rounded-full  absolute top-1/2  -translate-x-0 -translate-y-1/2
                          ${paymentMode === "partial" ? "left-0.5 bg-slate-300" : "left-5 bg-green-300 "}`}></div>
                      </div>
                      
                      <p className="text-sm font-normal leading-none">{paymentMode === "paid" ? "Paid" : "Partial"}</p>
                    </div>

                    {/* Partial amount controls */}
                    <AnimatePresence initial={false}>
                      {paymentMode === "partial" && (
                        <motion.div
                          key="partial-controls"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="space-y-3 overflow-hidden"
                        >
                          <div>
                            <Label
                              htmlFor="partial-amount"
                              className="text-xs text-gray-400"
                            >
                              Amount Received
                            </Label>
                            <Input
                              id="partial-amount"
                              type="number"
                              min="0"
                              max={maxBalance}
                              step="1"
                              value={partialAmount}
                              onChange={(e) => {
                                const next = e.target.value;
                                const pn = Math.max(Number(next || 0), 0);
                                const newMax = Math.max(0, preDiscountTotal - alreadyPaidView - pn);
                                const curDisc = Number(discountValue || 0);
                                if (curDisc > newMax) setDiscountValue(String(newMax));
                                setPartialAmount(next);
                              }}
                              placeholder="0"
                              className="bg-gray-900 border-gray-600 text-white"
                            />
                            {/* Discount input below Amount Received */}
                            <div className="mt-3">
                              <Label htmlFor="discount-modal-input" className="text-xs text-gray-400">Discount</Label>
                              <Input
                                id="discount-modal-input"
                                type="number"
                                min="0"
                                max={dynamicMaxDiscount}
                                step="1"
                                value={discountValue}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const n = Number(raw);
                                  const safe = Number.isFinite(n) ? Math.max(0, Math.min(n, dynamicMaxDiscount)) : 0;
                                  setDiscountValue(String(safe));
                                }}
                                placeholder="0"
                                className="bg-gray-900 border-gray-600 text-white"
                              />
                            </div>
                            {paymentMode === "partial" && (!partialAmount || Number(partialAmount) <= 0) && (grandTotal - toNum(bill.paidAmount || 0) > 0) && (
                              <p className="mt-1 text-xs text-gray-400">
                                Enter an amount greater than 0 to enable Save.
                              </p>
                            )}
                          </div>
                          {/* Quick chips removed */}

                          {/* Live summary (always visible, reflects discount and amount) */}
                          <AnimatePresence>
                            <motion.div
                              key="partial-controls"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="space-y-1 overflow-hidden"
                            >
                              <div className="flex justify-between text-gray-400 text-sm">
                                <span>Already paid:</span>
                                <span className="text-green-400">
                                  {currency}
                                  {alreadyPaidView.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-gray-400 text-sm">
                                <span>New total paid:</span>
                                <span className="text-green-400">
                                  {currency}
                                  {newPaidPreview.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-gray-400 text-sm">
                                <span>Will remain pending:</span>
                                <span className="text-orange-400">
                                  {currency}
                                  {newPendingPreview.toFixed(2)}
                                </span>
                              </div>
                            </motion.div>
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Payment Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        onClick={handleMarkAsPaid}
                        disabled={isUpdatingPayment}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isUpdatingPayment ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Marking...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Mark as Paid
                          </div>
                        )}
                      </Button>
                      <Button
                        onClick={handlePaymentUpdate}
                        disabled={
                          isUpdatingPayment ||
                          (paymentMode === "partial" &&
                            !(
                              Number(partialAmount) > 0 ||
                              (grandTotal - toNum(bill.paidAmount || 0) <= 0)
                            ))
                        }
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                        {isUpdatingPayment ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Updating...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            {paymentMode === "paid" ? "Save (Paid)" : "Save Payment"}
                          </div>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingPayment(false);
                          setPaymentMode("partial");
                          setPartialAmount("");
                        }}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Action Buttons */}
            {showShareButton && (
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    const id = resolveCustomerIdFromBill(bill);
                    if (!id) {
                      toast.error("Customer ID not available for this bill.");
                      return;
                    }
                    router.push(`/admin/customers/${id}/bills`);
                  }}
                  className="w-full flex-1 border-gray-300 text-gray-200 hover:bg-gray-800 hover:text-white"
                >
                  Check all bills
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Transform the bill object to match the BillDetails interface
                    const billDetails: BillDetails = {
                      ...bill,
                      repairFee:
                        (bill as any).repairFee ??
                        (bill as any).repairCharges ??
                        0,
                      grandTotal: grandTotal,
                      technician: bill.technician,
                      customerAuth: {
                        secretKey: bill.customer?.secretKey || undefined,
                      },
                    };
                    shareBillOnWhatsApp(billDetails);
                  }}
                  className=" w-full flex-1 border-green-300 text-green-500 hover:bg-green-800 hover:text-white">
                  <Share2 className="w-4 h-4 mr-2" />
                  <span className="sm:inline">WhatsApp</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    const billDetails: BillDetails = {
                      ...bill,
                      repairFee:
                        (bill as any).repairFee ??
                        (bill as any).repairCharges ??
                        0,
                      grandTotal: grandTotal,
                      technician: bill.technician,
                      customerAuth: {
                        secretKey: bill.customer?.secretKey || undefined,
                      },
                    };
                    // Use customer's phone if available; otherwise open composer without recipient
                    const recipient = bill.customer?.phone;
                    shareBillViaSMS(billDetails, recipient);
                  }}
                  className="flex-1 w-full border-blue-300 text-blue-400 hover:bg-blue-800 hover:text-white">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span className="sm:inline">SMS</span>
                </Button>
              </div>
            )}

            {/* {onDownloadPDF && (
              <Button
                onClick={() => onDownloadPDF(bill)}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                <span className="sm:inline">Download PDF</span>
              </Button>
            )} */}
          </div>
       
      </div>
    </Modal>
  );
};
