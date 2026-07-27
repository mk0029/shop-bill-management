"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { AppDateTimePicker } from "@/components/ui/app-date-time-picker";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { fetchCustomerAdvanceBalance } from "@/lib/customer-advance";

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
  const [advanceBalance, setAdvanceBalance] = useState(0);

  useEffect(() => {
    if (formData.customerId) {
      fetchCustomerAdvanceBalance(formData.customerId).then(setAdvanceBalance).catch(() => setAdvanceBalance(0));
    } else {
      setAdvanceBalance(0);
    }
  }, [formData.customerId]);

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

      {/* Customer Advance Balance Info */}
      {advanceBalance > 0 && <div className="p-3 rounded-xl" style={{background:"linear-gradient(135deg,rgba(52,211,153,0.12),rgba(16,185,129,0.08))",border:"1px solid rgba(52,211,153,0.2)"}}><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:"rgba(52,211,153,0.15)"}}><span className="text-sm">💰</span></div><div><p className="text-xs font-medium text-emerald-300">Advance Available</p><p className="text-lg font-bold text-emerald-400">₹{advanceBalance.toLocaleString()}</p></div></div></div>}

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
            removeSearchForce
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
            disablePastDates
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
