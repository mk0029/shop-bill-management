"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Save, CreditCard, Wallet } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";

interface BillSummarySidebarProps {
  selectedCustomer: any;
  selectedItems: any[];
  formData: any;
  calculateTotal: () => number;
  calculateGrandTotal: () => number;
  getPaymentDetails: () => {
    paymentStatus: "pending" | "partial" | "paid";
    paidAmount: number;
    balanceAmount: number;
  };
  onInputChange: (field: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export const BillSummarySidebar = ({
  selectedCustomer,
  selectedItems,
  formData,
  calculateTotal,
  calculateGrandTotal,
  getPaymentDetails,
  onInputChange,
  onSubmit,
  isLoading,
}: BillSummarySidebarProps) => {
  const { currency } = useLocaleStore();

  const itemsTotal = calculateTotal();
  const additionalCharges =
    Number(formData.repairCharges || 0) +
    Number(formData.homeVisitFee || 0) +
    Number(formData.laborCharges || 0);
  const grandTotal = calculateGrandTotal();
  const paymentDetails = getPaymentDetails();

  return (
    <Card className="bg-gray-900 border-gray-800 sticky top-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Bill Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedCustomer && (
          <div className="p-3 bg-gray-800 rounded-lg">
            <h4 className="font-medium text-white mb-2">Customer</h4>
            <p className="text-gray-300">{selectedCustomer.name}</p>
            <p className="text-sm text-gray-400">{selectedCustomer.phone}</p>
            {selectedCustomer.email && (
              <p className="text-sm text-gray-400">{selectedCustomer.email}</p>
            )}
            <p className="text-sm text-gray-400">{selectedCustomer.location}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">
              Items ({selectedItems.length})
            </span>
            <span className="text-white">
              {currency}
              {itemsTotal.toFixed(2)}
            </span>
          </div>

          {formData.repairCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Repair Charges</span>
              <span className="text-white">
                {currency}
                {Number(formData.repairCharges).toFixed(2)}
              </span>
            </div>
          )}

          {formData.homeVisitFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Home Visit Fee</span>
              <span className="text-white">
                {currency}
                {Number(formData.homeVisitFee).toFixed(2)}
              </span>
            </div>
          )}

          {formData.laborCharges > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Labor Charges</span>
              <span className="text-white">
                {currency}
                {Number(formData.laborCharges).toFixed(2)}
              </span>
            </div>
          )}

          <div className="border-t border-gray-700 pt-3">
            <div className="flex justify-between font-semibold">
              <span className="text-white">Total</span>
              <span className="text-blue-400 text-lg">
                {currency}
                {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Controls */}
        <div className="space-y-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="font-medium text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment Options
          </h4>

          {/* Mark as Paid Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-400" />
              <Label htmlFor="mark-paid" className="text-sm text-gray-300">
                Mark as Paid
              </Label>
            </div>
            <Switch
              id="mark-paid"
              checked={formData.isMarkAsPaid}
              onCheckedChange={(checked) =>
                onInputChange("isMarkAsPaid", checked)
              }
            />
          </div>

          {/* Partial Payment Toggle */}
          {!formData.isMarkAsPaid && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="partial-payment"
                  className="text-sm text-gray-300">
                  Enable Partial Payment
                </Label>
                <Switch
                  id="partial-payment"
                  checked={formData.enablePartialPayment}
                  onCheckedChange={(checked) =>
                    onInputChange("enablePartialPayment", checked)
                  }
                />
              </div>

              {/* Partial Payment Input */}
              {formData.enablePartialPayment && (
                <div className="space-y-2">
                  <Label
                    htmlFor="partial-amount"
                    className="text-xs text-gray-400">
                    Amount Received
                  </Label>
                  <Input
                    id="partial-amount"
                    type="number"
                    min="0"
                    max={grandTotal}
                    step="0.01"
                    value={formData.partialPaymentAmount || ""}
                    onChange={(e) =>
                      onInputChange("partialPaymentAmount", e.target.value)
                    }
                    placeholder="0.00"
                    className="bg-gray-900 border-gray-600 text-white"
                  />
                  {formData.partialPaymentAmount > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between text-gray-400">
                        <span>Paid:</span>
                        <span className="text-green-400">
                          {currency}
                          {paymentDetails.paidAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Pending:</span>
                        <span className="text-orange-400">
                          {currency}
                          {paymentDetails.balanceAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment Status Display */}
          {(formData.isMarkAsPaid ||
            (formData.enablePartialPayment &&
              formData.partialPaymentAmount > 0)) && (
            <div className="p-2 bg-gray-900 rounded border border-gray-600">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Payment Status:</span>
                <span
                  className={`font-medium ${
                    paymentDetails.paymentStatus === "paid"
                      ? "text-green-400"
                      : paymentDetails.paymentStatus === "partial"
                        ? "text-orange-400"
                        : "text-gray-400"
                  }`}>
                  {paymentDetails.paymentStatus.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={onSubmit}
          disabled={
            isLoading || selectedItems.length === 0 || !formData.customerId
          }
          className="w-full bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Bill...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Create Bill
            </div>
          )}
        </Button>

        {selectedItems.length === 0 && (
          <p className="text-xs text-gray-400 text-center">
            Add items to create bill
          </p>
        )}
      </CardContent>
    </Card>
  );
};
