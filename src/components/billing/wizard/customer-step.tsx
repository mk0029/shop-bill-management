"use client";

import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { AppDateTimePicker } from "@/components/ui/app-date-time-picker";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";

interface CustomerStepProps {
  formData: any;
  customers: any[];
  customersLoading: boolean;
  onInputChange: (field: string, value: string) => void;
  autocompleteResetKey?: number;
}

const serviceTypeOptions = [
  { value: "sale", label: "Sale" },
  { value: "repair", label: "Repair" },
  { value: "multiple_work", label: "Other" },
  { value: "installation", label: "Installation" },
  { value: "maintenance", label: "Maintenance" },
  { value: "fitting_wiring", label: "Fitting/Wiring" },
];

const locationOptions = [
  { value: "shop", label: "At Shop" },
  { value: "home", label: "Home Visit" },
  { value: "office", label: "Office Visit" },
  { value: "factory", label: "Factory Visit" },
];

const glassFieldsetStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "16px",
};

export function CustomerStep({
  formData,
  customers,
  customersLoading,
  onInputChange,
  autocompleteResetKey,
}: CustomerStepProps) {
  return (
    <div className="space-y-3 md:space-y-5">
      {/* Customer Selection */}
      <div style={glassFieldsetStyle} className="p-3 sm:p-4 md:p-5">
        <Label className="text-white text-sm font-medium mb-3 block">
          Customer
        </Label>
        <CustomerAutocomplete
          key={`bill-customer-${autocompleteResetKey}`}
          customers={customers}
          value={formData.customerId}
          onChange={(value: string) => onInputChange("customerId", value)}
          placeholder={
            customersLoading ? "Loading customers..." : "Type customer name"
          }
        />
      </div>

      {/* Service Type & Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div style={glassFieldsetStyle} className="p-3 sm:p-4 md:p-5">
          <Label className="text-white text-sm font-medium mb-3 block">
            Service Type
          </Label>
          <Dropdown
            options={serviceTypeOptions}
            value={formData.serviceType}
            onValueChange={(value: string) =>
              onInputChange("serviceType", value)
            }
            placeholder="Select service type"
          />
        </div>
        <div style={glassFieldsetStyle} className="p-3 sm:p-4 md:p-5">
          <Label className="text-white text-sm font-medium mb-3 block">
            Location
          </Label>
          <Dropdown
            options={locationOptions}
            value={formData.location}
            onValueChange={(value: string) => onInputChange("location", value)}
            placeholder="Select location"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div style={glassFieldsetStyle} className="p-3 sm:p-4 md:p-5">
          <Label className="text-white text-sm font-medium mb-3 block">
            Bill Date
          </Label>
          <AppDateTimePicker
            mode="date"
            value={formData.billDate}
            onChange={(v) => onInputChange("billDate", v)}
            placeholder="Select bill date"
          />
        </div>
        <div style={glassFieldsetStyle} className="p-3 sm:p-4 md:p-5">
          <Label className="text-white text-sm font-medium mb-3 block">
            Due Date
          </Label>
          <AppDateTimePicker
            mode="date"
            value={formData.dueDate}
            onChange={(v) => onInputChange("dueDate", v)}
            placeholder="Select due date"
          />
        </div>
      </div>

      {/* Notes */}
      <div style={glassFieldsetStyle} className="p-3 sm:p-4 md:p-5">
        <Label className="text-white text-sm font-medium mb-3 block">
          Notes
        </Label>
        <textarea
          value={formData.notes}
          onChange={(e) => onInputChange("notes", e.target.value)}
          placeholder="Any additional notes..."
          rows={3}
          className="w-full text-white placeholder-slate-500 resize-none outline-none p-3"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(16px)",
            borderRadius: "12px",
          }}
        />
      </div>
    </div>
  );
}

