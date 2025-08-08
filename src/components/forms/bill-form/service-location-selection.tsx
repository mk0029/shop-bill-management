import React from "react";
import { Dropdown } from "@/components/ui/dropdown";

interface ServiceLocationSelectionProps {
  serviceType: string;
  locationType: string;
  onServiceTypeChange: (value: string) => void;
  onLocationTypeChange: (value: string) => void;
}

const serviceTypeOptions = [
  { value: "sale", label: "Sale" },
  { value: "repair", label: "Repair" },
  { value: "custom", label: "Custom" },
];

const locationTypeOptions = [
  { value: "shop", label: "Shop" },
  { value: "home", label: "Home" },
];

export function ServiceLocationSelection({
  serviceType,
  locationType,
  onServiceTypeChange,
  onLocationTypeChange,
}: ServiceLocationSelectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Service Type
        </label>
        <Dropdown
          options={serviceTypeOptions}
          value={serviceType}
          onValueChange={onServiceTypeChange}
          placeholder="Select Service Type"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Location
        </label>
        <Dropdown
          options={locationTypeOptions}
          value={locationType}
          onValueChange={onLocationTypeChange}
          placeholder="Select Location"
        />
      </div>
    </div>
  );
}

export default ServiceLocationSelection;
