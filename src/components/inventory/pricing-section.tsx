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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice" className="text-gray-300">
              Purchase Price ({currency}) *
            </Label>
            <Input
              id="purchasePrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => onInputChange("purchasePrice", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter purchase price"
            />
            {errors.purchasePrice && (
              <p className="text-red-400 text-sm">{errors.purchasePrice}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellingPrice" className="text-gray-300">
              Selling Price ({currency}) *
            </Label>
            <Input
              id="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.sellingPrice}
              onChange={(e) => onInputChange("sellingPrice", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter selling price"
            />
            {errors.sellingPrice && (
              <p className="text-red-400 text-sm">{errors.sellingPrice}</p>
            )}
          </div>
        </div>

        {/* Profit Calculation Display */}
        {formData.purchasePrice && formData.sellingPrice && (
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
                <p className="text-blue-400 font-medium">
                  {calculateMargin()}%
                </p>
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
        )}
      </CardContent>
    </Card>
  );
};
