/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import { AppDateTimePicker } from "@/components/ui/app-date-time-picker";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { SwitchToggle } from "@/components/ui/switch-toggle";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/store/locale-store";

const glassCardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const glassInputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(16px)",
  borderRadius: "12px",
};

interface CustomerInfoSectionProps {
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
];

export const CustomerInfoSection = ({
  formData,
  customers,
  customersLoading,
  onInputChange,
  autocompleteResetKey = 0,
}: CustomerInfoSectionProps) => {
  const router = useRouter();
  const { currency } = useLocaleStore();

  return (
    <div style={glassCardStyle} className="p-5 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customerId" className="text-sm text-slate-300">
            Select Customer <span className="text-red-400">*</span>
          </Label>
          <CustomerAutocomplete
            key={`bill-customer-autocomplete-${autocompleteResetKey}`}
            customers={customers}
            value={formData.customerId}
            onChange={(value) => onInputChange("customerId", value)}
            placeholder={
              customersLoading ? "Loading customers..." : "Type customer name"
            }
          />
          {customers.length === 0 && !customersLoading && (
            <div className="text-xs" style={{ color: "rgba(251,191,36,0.8)" }}>
              <p>No customers available.</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push("/admin/customers/add")}
                className="text-blue-400 hover:text-blue-300 p-0 h-auto text-xs"
              >
                Add customer →
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="serviceType" className="text-sm text-slate-300">
            Service Type <span className="text-red-400">*</span>
          </Label>
          <Dropdown
            options={serviceTypeOptions}
            value={formData.serviceType}
            onValueChange={(value) => {
              onInputChange("serviceType", value);
              if (value === "repair" || value === "multiple_work") {
                onInputChange("location", "shop");
              } else {
                onInputChange("location", "");
              }
            }}
            placeholder="Select service type"
            searchable={false}
          />
        </div>

        {(formData.serviceType === "repair" ||
          formData.serviceType === "multiple_work") && (
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm text-slate-300">
              Location Type <span className="text-red-400">*</span>
            </Label>
            <SwitchToggle
              steps={[
                { value: "shop", label: "Shop" },
                { value: "home", label: "Other" },
              ]}
              value={formData.location || "shop"}
              onValueChange={(value) => onInputChange("location", value)}
              trackClassName="bg-white/10"
              thumbClassName="bg-white/20"
              labelClassName="text-sm text-white"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="billDate" className="text-sm text-slate-300">
            Bill Date <span className="text-red-400">*</span>
          </Label>
          <AppDateTimePicker
            mode="date"
            value={formData.billDate}
            onChange={(v) => onInputChange("billDate", v)}
            placeholder="Select bill date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate" className="text-sm text-slate-300">
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

      <div className="space-y-2 mt-4">
        <Label htmlFor="notes" className="text-sm text-slate-300">
          Notes
        </Label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => onInputChange("notes", e.target.value)}
          className="w-full min-h-[80px] px-3 py-2 rounded-xl text-sm text-slate-100 placeholder-slate-400/80 resize-none outline-none focus:border-white/25"
          style={{
            ...glassInputStyle,
            resize: "none",
          }}
          placeholder="Add any additional notes..."
        />
      </div>

      {(formData.serviceType === "repair" ||
        formData.serviceType === "multiple_work") && (
        <div className="space-y-2 mt-4">
          <Label htmlFor="repairFee" className="text-sm text-slate-300">
            Repair Charges ({currency})
          </Label>
          <Input
            id="repairFee"
            type="number"
            min="0"
            step="0.01"
            value={formData.repairFee || ""}
            onChange={(e) => onInputChange("repairFee", e.target.value)}
            style={glassInputStyle}
            placeholder="Enter repair charges"
          />
        </div>
      )}

      {(formData.serviceType === "repair" ||
        formData.serviceType === "multiple_work") &&
        formData.location === "home" && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="visitingCharges" className="text-sm text-slate-300">
              Visit Fee ({currency})
            </Label>
            <Input
              id="visitingCharges"
              type="number"
              min="50"
              max="200"
              step="1"
              value={formData.visitingCharges || ""}
              onChange={(e) => onInputChange("visitingCharges", e.target.value)}
              style={glassInputStyle}
              placeholder="50-200"
            />
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
              Minimum ₹50, Maximum ₹200
            </p>
          </div>
        )}
    </div>
  );
};
