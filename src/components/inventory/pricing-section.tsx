import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";
import { currency } from "@/lib/inventory-data";

interface PricingSectionProps {
  formData: any;
  errors: Record<string, string>;
  onInputChange: (field: string, value: string) => void;
}

export const PricingSection = ({
  formData,
  errors,
  onInputChange,
}: PricingSectionProps) => {
  const getQty = () => {
    const v = parseFloat(String(formData.currentStock || ""));
    return Number.isFinite(v) ? v : 0;
  };

  const getTotalAmount = () => {
    const v = parseFloat(String(formData.purchaseTotalAmount || ""));
    return Number.isFinite(v) ? v : 0;
  };

  const toMoney = (n: number) => {
    if (!Number.isFinite(n)) return "";
    return n.toFixed(2);
  };

  const recomputePerPieceFromTotal = (qty: number, total: number) => {
    if (!(qty > 0) || !(total >= 0)) return;
    const per = total / qty;
    if (Number.isFinite(per)) {
      onInputChange("purchasePrice", toMoney(per));
    }
  };

  // const recomputeTotalFromPerPiece = (qty: number, perPiece: number) => {
  //   if (!(qty > 0) || !(perPiece >= 0)) return;
  //   const total = qty * perPiece;
  //   if (Number.isFinite(total)) {
  //     onInputChange("purchaseTotalAmount", toMoney(total));
  //     // Also update purchase price = total / qty
  //     const purchasePer = total / qty;
  //     if (Number.isFinite(purchasePer)) {
  //       onInputChange("purchasePrice", toMoney(purchasePer));
  //     }
  //   }
  // };

  const calculateMargin = () => {
    const purchase = parseFloat(formData.purchasePrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    if (purchase > 0 && selling > 0) {
      return (((selling - purchase) / purchase) * 100).toFixed(1);
    }
    return "0";
  };

  const calculateProfit = () => {
    const purchase = parseFloat(formData.purchasePrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    return (selling - purchase).toFixed(2);
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Pricing Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-white mb-3">
            Quick Price Calculator
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseQty" className="text-gray-300">
                Total Items Count
              </Label>
              <Input
                id="purchaseQty"
                type="number"
                min="0"
                step="1"
                value={formData.currentStock}
                onChange={(e) => {
                  const nextQtyRaw = e.target.value;
                  onInputChange("currentStock", nextQtyRaw);
                  const qty = parseFloat(String(nextQtyRaw || "")) || 0;
                  const total = getTotalAmount();
                  if (total > 0 && qty > 0)
                    recomputePerPieceFromTotal(qty, total);
                }}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="e.g. 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalAmountReceived" className="text-gray-300">
                Total Purchase Amount ({currency})
              </Label>
              <Input
                id="totalAmountReceived"
                type="number"
                min="0"
                step="0.01"
                value={formData.purchaseTotalAmount || ""}
                onChange={(e) => {
                  const nextTotalRaw = e.target.value;
                  onInputChange("purchaseTotalAmount", nextTotalRaw);
                  const total = parseFloat(String(nextTotalRaw || "")) || 0;
                  const qty = getQty();
                  if (total > 0 && qty > 0)
                    recomputePerPieceFromTotal(qty, total);
                }}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="e.g. 500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice" className="text-gray-300">
              Purchase Price ({currency}) (auto)
            </Label>
            <Input
              disabled
              id="purchasePrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => {
                onInputChange("purchasePrice", e.target.value);
                // Optional: if user manually edits purchase price, recompute total from it
                const per = parseFloat(String(e.target.value || "")) || 0;
                const qty = getQty();
                if (qty > 0 && per >= 0) {
                  const total = qty * per;
                  if (Number.isFinite(total)) {
                    onInputChange("purchaseTotalAmount", toMoney(total));
                  }
                }
              }}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Auto-calculated"
            />
            {errors.purchasePrice && (
              <p className="text-red-400 text-sm">{errors.purchasePrice}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellingPrice" className="text-gray-300">
              Selling Price ({currency})
            </Label>
            <Input
              id="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => {
                const nextPerRaw = e.target.value;
                onInputChange("sellingPrice", nextPerRaw);
                const per = parseFloat(String(nextPerRaw || "")) || 0;
                const qty = getQty();
                if (qty > 0 && per >= 0) recomputeTotalFromPerPiece(qty, per);
              }}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Sale Per Piece"
            />
            {errors.sellingPrice && (
              <p className="text-red-400 text-sm">{errors.sellingPrice}</p>
            )}
          </div>
        </div>

        {/* Profit Calculation Display */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium text-white mb-2">Profit Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Profit per unit:</span>
              <p className="text-green-400 font-medium">
                {currency}
                {calculateProfit()}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Margin:</span>
              <p className="text-blue-400 font-medium">{calculateMargin()}%</p>
            </div>
            <div>
              <span className="text-gray-400">Total value:</span>
              <p className="text-white font-medium">
                {currency}
                {(
                  parseFloat(formData.sellingPrice) *
                  parseFloat(formData.currentStock || "0")
                ).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
