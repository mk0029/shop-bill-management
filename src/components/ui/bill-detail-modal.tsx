/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useSanityBillStore } from "@/store/sanity-bill-store";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Switch not needed after redesign of payment UI
import {
  Download,
  Share2,
  Calendar,
  MapPin,
  FileText,
  X,
  CreditCard,
  Save,
  Wallet,
} from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";
import { toast } from "sonner";
import { shareBillOnWhatsApp, BillDetails } from "@/lib/whatsapp-share";

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
  const { currency } = useLocaleStore();

  // Payment state management (redesigned)
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"paid" | "partial">("partial");
  const [partialAmount, setPartialAmount] = useState("");
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);

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
  const grandTotal = explicitTotal > 0 ? explicitTotal : itemsTotal + additionalCharges;
console.log("grandTotal", grandTotal,'fulll bill',bill);
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
    return null;
  };

  // Handle payment update
  const handlePaymentUpdate = async () => {
    if (!onUpdatePayment) return;
    const paymentDetails = calculatePaymentDetails();
    if (!paymentDetails) return;
    setIsUpdatingPayment(true);
    try {
      await onUpdatePayment(bill._id || bill.id, paymentDetails);
      // Ensure global lists refresh in case realtime misses an event
      try {
        await useSanityBillStore.getState().fetchBills();
      } catch { }
      if (bill) {
        bill.paymentStatus = paymentDetails.paymentStatus;
        bill.paidAmount = paymentDetails.paidAmount;
        bill.balanceAmount = paymentDetails.balanceAmount;
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

  // Quick amount helpers removed per UX request

  // Reset payment state when modal closes
  const handleClose = () => {
    setIsEditingPayment(false);
    setPaymentMode("partial");
    setPartialAmount("");
    onClose();
  };
  console.log("bill dffjvn r fer ev fe vf ", bill);
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
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Bill #{bill.billNumber || bill._id}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-400">
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
              </div>
            </div>

            <Badge
              className={`${getStatusColor(bill.paymentStatus || bill.status)} px-4 py-2 text-sm font-medium`}>
              {(bill.paymentStatus || bill.status || "pending").toUpperCase()}
            </Badge>
          </div>

          {/* Customer Info */}
          {bill.customer && (
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="font-medium text-white mb-2">
                Customer Information
              </h3>
              <div className="text-sm text-gray-300 space-y-1">
                <p className="font-medium">{bill.customer.name}</p>
                {bill.customer.phone && (
                  <p className="text-gray-400">{bill.customer.phone}</p>
                )}
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
              <h3 className="font-medium text-white mb-4">Items</h3>
              <div className="space-y-3">
                {bill.items.map((item: any, index: number) =>
              {
                return    (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex-1">
                      <p className="font-medium text-white mb-1">
                        {item?.product?.name || "Unknown Item"}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.brand && (
                          <Badge
                            variant="outline"
                            className="text-blue-400 border-blue-600">
                            {item.brand}
                          </Badge>
                        )}
                        {item.category && (
                          <Badge
                            variant="outline"
                            className="text-purple-400 border-purple-600">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                      {item.specifications && (
                        <p className="text-sm text-gray-400 mb-2">
                          {item.specifications}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
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
                      <p className="font-semibold text-white text-lg">
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
                )})}
              </div>
            </div>
          )}

          {/* Additional Charges */}
          {hasAnyCharge && (
  <div>
    <h3 className="font-medium text-white mb-4">Additional Charges</h3>
    <div className="space-y-3">
      {additionalChargesF?.map((charge, index) => (
      charge.value>0&&  <div
          key={index}
          className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700"
        >
          <span className="text-gray-300">{charge.label}</span>
          <span className="font-medium text-white">
            {currency}
            {charge.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  </div>
)}


          {/* Total Section */}
          <div className="border-t border-gray-700 pt-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xl font-bold">
                <span className="text-white">Total Amount</span>
                <span className="text-white">
                  {currency}
                  {/* {grandTotal <= 0
                    ? grandTotal.toFixed(2)
                    : bill.balanceAmount?.toFixed(2)} */}
                  {grandTotal?.toFixed(2) || bill?.balanceAmount}
                </span>
              </div>

              {bill.paymentStatus === "partial" && (
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-400">Paid Amount</span>
                    <span className="text-green-400 font-medium">
                      {currency}
                      {(bill.paidAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-orange-400">Pending Amount</span>

                    <span className="text-orange-400 font-medium">
                      {currency}
                      {(
                        bill.balanceAmount ||
                        grandTotal - (bill.paidAmount || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
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
          {showPaymentControls && onUpdatePayment && bill.paymentStatus !== "paid" && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Update Payment
                  </h3>
                  {!isEditingPayment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingPayment(true)}
                      className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white">
                      Edit Payment
                    </Button>
                  )}
                </div>

                {isEditingPayment && (
                  <div className="space-y-4">
                    {/* Mode selector */}
                    <div className="flex gap-2">
                      <Button
                        variant={paymentMode === "paid" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaymentMode("paid")}
                        className={paymentMode === "paid" ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        Mark Full Paid
                      </Button>
                      <Button
                        variant={paymentMode === "partial" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaymentMode("partial")}
                      >
                        Record Partial Payment
                      </Button>
                    </div>

                    {/* Partial amount controls */}
                    {paymentMode === "partial" && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="partial-amount" className="text-xs text-gray-400">
                            Amount Received
                          </Label>
                          <Input
                            id="partial-amount"
                            type="number"
                            min="0"
                            max={grandTotal}
                            step="0.01"
                            value={partialAmount}
                            onChange={(e) => setPartialAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-gray-900 border-gray-600 text-white"
                          />
                        </div>
                        {/* Quick chips removed */}

                        {/* Live summary */}
                        {Number(partialAmount) >= 0 && partialAmount !== "" && (
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between text-gray-400">
                              <span>Already paid:</span>
                              <span className="text-green-400">{currency}{toNum(bill.paidAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                              <span>New total paid:</span>
                              <span className="text-green-400">{currency}{Math.min(toNum(bill.paidAmount || 0) + Math.max(Number(partialAmount), 0), grandTotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400">
                              <span>Will remain pending:</span>
                              <span className="text-orange-400">{currency}{Math.max(0, grandTotal - Math.min(toNum(bill.paidAmount || 0) + Math.max(Number(partialAmount), 0), grandTotal)).toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Payment Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handlePaymentUpdate}
                        disabled={
                          isUpdatingPayment ||
                          (paymentMode === "partial" && (!partialAmount || Number(partialAmount) <= 0))
                        }
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isUpdatingPayment ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Updating...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            Save Payment
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
                        className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 sm:flex-none border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white">
              Close
            </Button>

            {showShareButton && (
              <Button
                variant="outline"
                onClick={() => {
                  // Transform the bill object to match the BillDetails interface
                  const billDetails: BillDetails = {
                    ...bill,
                    repairFee: (bill as any).repairFee ?? (bill as any).repairCharges ?? 0,
                    grandTotal: grandTotal,
                    customerAuth: {
                      secretKey: bill.customer?.secretKey || undefined,
                    },
                  };
                  shareBillOnWhatsApp(billDetails);
                }}
                className="flex-1 sm:flex-none border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white">
                <Share2 className="w-4 h-4 mr-2" />
                <span className="sm:inline">Share on WhatsApp</span>
              </Button>
            )}

            {onDownloadPDF && (
              <Button
                onClick={() => onDownloadPDF(bill)}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                <span className="sm:inline">Download PDF</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
