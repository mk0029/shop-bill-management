import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Save } from "lucide-react";
import { useLocaleStore } from "@/store/locale-store";

interface BillSummarySidebarProps {
  selectedCustomer: any;
  selectedItems: any[];
  formData: any;
  calculateTotal: () => number;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export const BillSummarySidebar = ({
  selectedCustomer,
  selectedItems,
  formData,
  calculateTotal,
  onSubmit,
  isLoading,
}: BillSummarySidebarProps) => {
  const { currency } = useLocaleStore();

  const itemsTotal = calculateTotal();
  const additionalCharges =
    Number(formData.repairCharges || 0) +
    Number(formData.homeVisitFee || 0) +
    Number(formData.laborCharges || 0);
  const grandTotal = itemsTotal + additionalCharges;

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
