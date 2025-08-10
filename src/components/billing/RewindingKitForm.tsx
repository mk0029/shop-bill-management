"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { Textarea } from "@/components/ui/textarea";
import { BillItem } from "@/lib/inventory-management";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RewindingKitFormProps {
  onAddItem: (item: Omit<BillItem, "productId">) => void;
}

const initialKitState = {
  kitName: "",
  kitType: "Cooler", // Default to 'Cooler' to show Multi-Speed toggle initially
  boreSize: "",
  sizeInInches: "",
  multiSpeed: false,
  heavyLoadOption: "",
  oldWindingMaterial: "Copper",
  newWindingMaterial: "Copper",
  priceDifference: "",
  windingRate: "",
  quantity: 1,
};

const kitTypeOptions = [
  { value: "Cooler", label: "Cooler Kit" },
  { value: "Motor", label: "Motor Kit" },
];

const materialOptions = [
  { value: "Copper", label: "Copper" },
  { value: "Aluminum", label: "Aluminum" },
];

const heavyLoadOptions = [
  { value: "", label: "None" },
  { value: "0.5hp", label: "0.5 HP" },
  { value: "1hp", label: "1 HP" },
  { value: "1.5hp", label: "1.5 HP" },
  { value: "2hp", label: "2 HP" },
  { value: "2.5hp", label: "2.5 HP" },
  { value: "3hp", label: "3 HP" },
];

export function RewindingKitForm({ onAddItem }: RewindingKitFormProps) {
  const [kitData, setKitData] = useState(initialKitState);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setKitData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: keyof typeof initialKitState, value: string) => {
    setKitData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    const { kitName, windingRate, priceDifference, quantity } = kitData;
    if (!kitName || !windingRate || quantity <= 0) {
      alert("Please fill in Kit Name, Winding Rate, and Quantity.");
      return;
    }

    const totalUnitPrice = parseFloat(windingRate) + (parseFloat(priceDifference) || 0);

    const newItem = {
      productName: `Rewinding Kit - ${kitName}`,
      quantity: quantity,
      unitPrice: totalUnitPrice,
      specifications: JSON.stringify(kitData, null, 2),
    };

    onAddItem(newItem as any);
    setKitData(initialKitState);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Rewinding Kit Service</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="kitName">Kit Name</Label>
            <Input id="kitName" name="kitName" value={kitData.kitName} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="kitType">Kit Type</Label>
            <Dropdown options={kitTypeOptions} value={kitData.kitType} onValueChange={(value) => handleSelectChange('kitType', value)} />
          </div>
          <div>
            <Label htmlFor="boreSize">Kit Bore Size</Label>
            <Input id="boreSize" name="boreSize" type="number" value={kitData.boreSize} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="sizeInInches">Kit Size in Inches</Label>
            <Input id="sizeInInches" name="sizeInInches" type="number" value={kitData.sizeInInches} onChange={handleInputChange} />
          </div>
          {kitData.kitType === 'Cooler' && (
            <div className="flex items-center space-x-2">
              <Switch id="multiSpeed" checked={kitData.multiSpeed} onCheckedChange={(checked) => setKitData(prev => ({...prev, multiSpeed: checked}))} />
              <Label htmlFor="multiSpeed">Multi-Speed</Label>
            </div>
          )}
        </div>
        <div>
          <Label>Heavy Load Option</Label>
          <Dropdown options={heavyLoadOptions} value={kitData.heavyLoadOption} onValueChange={(value) => handleSelectChange('heavyLoadOption', value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Old Winding Material</Label>
            <Dropdown options={materialOptions} value={kitData.oldWindingMaterial} onValueChange={(value) => handleSelectChange('oldWindingMaterial', value)} />
          </div>
          <div>
            <Label>New Winding Material</Label>
            <Dropdown options={materialOptions} value={kitData.newWindingMaterial} onValueChange={(value) => handleSelectChange('newWindingMaterial', value)} />
          </div>
          {kitData.oldWindingMaterial !== kitData.newWindingMaterial && (
            <div>
              <Label htmlFor="priceDifference">Price Difference</Label>
              <Input id="priceDifference" name="priceDifference" type="number" value={kitData.priceDifference} onChange={handleInputChange} />
            </div>
          )}
          <div>
            <Label htmlFor="windingRate">Winding Rate</Label>
            <Input id="windingRate" name="windingRate" type="number" value={kitData.windingRate} onChange={handleInputChange} />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" value={kitData.quantity} onChange={handleInputChange} />
          </div>
        </div>
        <Button onClick={handleAddItem} className="w-full">
          Add Rewinding Service to Bill
        </Button>
      </CardContent>
    </Card>
  );
}
