"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Search } from "lucide-react";
import { sanityApiService } from "@/lib/sanity-api-service";
import {
  roundCurrency,
  calculateReceivedAmount,
  formatCurrencyINR,
  validateManualRecord,
  buildRecordPayload,
  type CustomerSelection,
} from "@/lib/cashbook-calculations";
import { SearchableCustomerInput } from "@/components/cash-book/searchable-customer-input";
import { useCustomers } from "@/hooks/use-sanity-data";
import { toast } from "sonner";
import ResponsiveAccordion from "../ui/responsive-accordion";

export function CashbookDashboardSection() {
  const { customers } = useCustomers();
  const [transactionType, setTransactionType] = useState<"credit" | "debit">("credit");
  const [customerSelection, setCustomerSelection] = useState<CustomerSelection>({
    customerId: null,
    customerName: "",
    isCustomName: false,
  });
  const [amount, setAmount] = useState<string>("");
  const [pendingAmountStr, setPendingAmountStr] = useState<string>("0");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedTotalAmount = Number(amount);
  const isDebit = transactionType === "debit";
  const safeTotal = roundCurrency(Number.isFinite(parsedTotalAmount) ? parsedTotalAmount : 0);
  const safePending = isDebit ? 0 : roundCurrency(Number.isFinite(Number(pendingAmountStr)) ? Number(pendingAmountStr) : 0);
  const receivedAmount = calculateReceivedAmount(safeTotal, safePending, transactionType);

  const isSaveDisabled =
    submitting ||
    !customerSelection.customerName.trim() ||
    !Number.isFinite(parsedTotalAmount) ||
    parsedTotalAmount <= 0 ||
    !purpose.trim();

  const resetForm = () => {
    setAmount("");
    setPendingAmountStr("0");
    setPurpose("");
    setCustomerSelection({ customerId: null, customerName: "", isCustomName: false });
    setTransactionType("credit");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateManualRecord({
      customer: customerSelection,
      totalAmount: safeTotal,
      pendingAmount: safePending,
      purpose,
      type: transactionType,
    });
    if (!validation.valid) {
      toast.error(validation.error || "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildRecordPayload(
        { customer: customerSelection, totalAmount: safeTotal, pendingAmount: safePending, purpose, type: transactionType },
        "",
      );
      const entryData: any = {
        amount: payload.amount,
        totalAmount: payload.totalAmount,
        pendingAmount: payload.pendingAmount,
        receivedAmount: payload.receivedAmount,
        type: payload.type,
        source: payload.source,
        status: payload.status,
        notes: payload.purpose,
        customerName: payload.customerName,
        customerId: payload.customerId,
        isCustomName: payload.isCustomName,
      };
      if (payload.customerId) {
        entryData.user = { _type: "reference", _ref: payload.customerId };
      }
      const result = await sanityApiService.cashBook.createEntry(entryData);
      if (result.success) {
        toast.success(isDebit ? "Debit entry added" : "Cashbook entry added");
        resetForm();
      } else {
        toast.error(result.error || "Failed to add entry");
      }
    } catch {
      toast.error("Failed to add entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveAccordion
      removePX
      title={
        <CardHeader className="!p-0">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Cash Book
          </CardTitle>
        </CardHeader>
      }
    >
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-gray-300 text-sm">Type</Label>
            <div className="flex gap-2 mt-1" role="radiogroup" aria-label="Transaction type">
              <button
                type="button"
                role="radio"
                aria-pressed={transactionType === "credit"}
                onClick={() => { setTransactionType("credit"); if (pendingAmountStr === "") setPendingAmountStr("0"); }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  transactionType === "credit"
                    ? "bg-emerald-600/20 text-white shadow-lg shadow-emerald-600/25"
                    : "bg-white/[0.04] text-gray-400 hover:text-gray-200 border border-white/[0.06]"
                }`}
              >
                <span className="text-xs">↑</span> Credit
              </button>
              <button
                type="button"
                role="radio"
                aria-pressed={transactionType === "debit"}
                onClick={() => { setTransactionType("debit"); setPendingAmountStr("0"); }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  transactionType === "debit"
                    ? "bg-red-600/20 text-white shadow-lg shadow-red-600/25"
                    : "bg-white/[0.04] text-gray-400 hover:text-gray-200 border border-white/[0.06]"
                }`}
              >
                <span className="text-xs">↓</span> Debit
              </button>
            </div>
          </div>

          {isDebit ? (
            <div className="space-y-1">
              <Label className="text-gray-300 text-sm">Recipient / Shop Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <Input
                  type="text"
                  value={customerSelection.customerName}
                  onChange={(e) => setCustomerSelection({ customerId: null, customerName: e.target.value, isCustomName: true })}
                  placeholder="e.g. Rajesh Electronics, Star Distributors..."
                  disabled={submitting}
                  className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500 !pl-8"
                />
              </div>
            </div>
          ) : (
            <SearchableCustomerInput
              customers={customers}
              value={customerSelection}
              onChange={setCustomerSelection}
              disabled={submitting}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-gray-300 text-sm">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500 !pl-7"
                  disabled={submitting}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300 text-sm">Purpose</Label>
              <Input
                type="text"
                value={purpose}
                onChange={(e) => { if (e.target.value.length <= 200) setPurpose(e.target.value); }}
                placeholder="e.g. Winding, material..."
                className="bg-gray-800/50 border-gray-700/70 text-white placeholder-gray-500"
                disabled={submitting}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSaveDisabled}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {submitting ? "Adding..." : `Add ${transactionType === "credit" ? "Credit" : "Debit"} Entry`}
          </Button>
        </form>
      </CardContent>
    </ResponsiveAccordion>
  );
}
