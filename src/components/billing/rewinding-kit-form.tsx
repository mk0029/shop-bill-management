"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dropdown } from "@/components/ui/dropdown";
import { BillFormData } from "@/hooks/use-bill-form";

interface RewindingKitFormProps {
  formData: BillFormData;
  onInputChange: (field: keyof BillFormData, value: any) => void;
  errors: any; // You might want to replace 'any' with a more specific type
}

const heavyLoadOptions = [
  { id: "0.5hp", label: "0.5 HP" },
  { id: "1hp", label: "1 HP" },
  { id: "1.5hp", label: "1.5 HP" },
  { id: "2hp", label: "2 HP" },
  { id: "2.5hp", label: "2.5 HP" },
  { id: "3hp", label: "3 HP" },
];

const materialOptions = [
  { value: "copper", label: "Copper" },
  { value: "aluminum", label: "Aluminum" },
];

export const RewindingKitForm: React.FC<RewindingKitFormProps> = ({ formData, onInputChange, errors }) => {
  const handleMultiSelectChange = (id: string, checked: boolean | "indeterminate") => {
    const currentSelection = formData.heavyLoadOptions || [];
    const newSelection = checked
      ? [...currentSelection, id]
      : currentSelection.filter((optionId) => optionId !== id);
    onInputChange("heavyLoadOptions", newSelection);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewinding Kit Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="kitName">Kit Name</Label>
            <Input id="kitName" name="kitName" value={formData.kitName || ''} onChange={(e) => onInputChange('kitName', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="kitBoreSize">Kit Bore Size</Label>
            <Input id="kitBoreSize" name="kitBoreSize" type="number" value={formData.kitBoreSize || ''} onChange={(e) => onInputChange('kitBoreSize', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="kitSizeInInches">Kit Size in Inches</Label>
            <Input id="kitSizeInInches" name="kitSizeInInches" type="number" value={formData.kitSizeInInches || ''} onChange={(e) => onInputChange('kitSizeInInches', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="windingRate">Winding Rate</Label>
            <Input id="windingRate" name="windingRate" type="number" value={formData.windingRate || ''} onChange={(e) => onInputChange('windingRate', e.target.value)} />
          </div>
        </div>

        {formData.kitType === 'cooler' && (
            <div className="flex items-center space-x-2">
                <Switch id="isMultiSpeed" checked={formData.isMultiSpeed} onCheckedChange={(checked) => onInputChange('isMultiSpeed', checked)} />
                <Label htmlFor="isMultiSpeed">Multi-Speed</Label>
            </div>
        )}

        <div>
          <Label>Heavy Load Options</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {heavyLoadOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox id={option.id} onCheckedChange={(checked) => handleMultiSelectChange(option.id, checked)} checked={formData.heavyLoadOptions?.includes(option.id)} />
                <Label htmlFor={option.id}>{option.label}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label>Old Winding Material</Label>
                <Dropdown options={materialOptions} value={formData.oldWindingMaterial} onValueChange={(value) => onInputChange('oldWindingMaterial', value)} />
            </div>
            <div>
                <Label>New Winding Material</Label>
                <Dropdown options={materialOptions} value={formData.newWindingMaterial} onValueChange={(value) => onInputChange('newWindingMaterial', value)} />
            </div>
        </div>

        {formData.oldWindingMaterial !== formData.newWindingMaterial && (
            <div>
                <Label htmlFor="priceDifference">Price Difference</Label>
                <Input id="priceDifference" name="priceDifference" type="number" value={formData.priceDifference || ''} onChange={(e) => onInputChange('priceDifference', e.target.value)} />
            </div>
        )}

      </CardContent>
    </Card>
  );
};
