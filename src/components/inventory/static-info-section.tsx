import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";

interface StaticInfoSectionProps {
  formData: any;
  errors: Record<string, string>;
  onInputChange: (field: string, value: string) => void;
  isExistingProductSelected?: boolean;
}

const unitOptions = [
  { value: "piece", label: "Piece" },
  { value: "meter", label: "Meter" },
  { value: "kg", label: "Kilogram" },
  { value: "liter", label: "Liter" },
  { value: "box", label: "Box" },
  { value: "roll", label: "Roll" },
];

export const StaticInfoSection = ({
  formData,
  errors,
  onInputChange,
  isExistingProductSelected,
}: StaticInfoSectionProps) => {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="unit" className="text-gray-300">
              Unit *
            </Label>
            <Dropdown
              options={unitOptions}
              value={formData.unit}
              onValueChange={(value) => onInputChange("unit", value)}
              placeholder="Select unit"
              className="bg-gray-800 border-gray-700"
              disabled={isExistingProductSelected}
            />
            {errors.unit && (
              <p className="text-red-400 text-sm">{errors.unit}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentStock" className="text-gray-300">
              Current Stock *
            </Label>
            <Input
              id="currentStock"
              type="number"
              min="0"
              value={formData.currentStock}
              onChange={(e) => onInputChange("currentStock", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter stock quantity"
            />
            {errors.currentStock && (
              <p className="text-red-400 text-sm">{errors.currentStock}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-300">
            Description
          </Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => onInputChange("description", e.target.value)}
            className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter product description..."
            disabled={isExistingProductSelected}
          />
        </div>
      </CardContent>
    </Card>
  );
};
