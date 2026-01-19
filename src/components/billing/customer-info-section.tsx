/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dropdown } from "@/components/ui/dropdown";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { SwitchToggle } from "@/components/ui/switch-toggle";
import { useRouter } from "next/navigation";
import { useLocaleStore } from "@/store/locale-store";

interface CustomerInfoSectionProps {
  formData: any;
  customers: any[];
  customersLoading: boolean;
  onInputChange: (field: string, value: string) => void;
}

const serviceTypeOptions = [
  { value: "sale", label: "Sale" },
  { value: "repair", label: "Repair" },
  { value: "multiple_work", label: "Other" },
  // { value: "fitting_wiring", label: "Fitting/Wiring" },
];

export const CustomerInfoSection = ({
  formData,
  customers,
  customersLoading,
  onInputChange,
}: CustomerInfoSectionProps) => {
  const router = useRouter();
  const { currency } = useLocaleStore();

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerId" className="text-gray-300">
              Select Customer *
            </Label>
            <CustomerAutocomplete
              customers={customers}
              value={formData.customerId}
              onChange={(value) => onInputChange("customerId", value)}
              placeholder={
                customersLoading ? "Loading customers..." : "Type customer name"
              }
            />
            {customers.length === 0 && !customersLoading && (
              <div className="text-xs text-yellow-400">
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
            <Label htmlFor="serviceType" className="text-gray-300">
              Service Type *
            </Label>
            <Dropdown
              options={serviceTypeOptions}
              value={formData.serviceType}
              onValueChange={(value) => {
                onInputChange("serviceType", value);
                // Set location based on service type
                if (value === "repair" || value === "multiple_work") {
                  onInputChange("location", "shop"); // Default to shop for repair and multiple work
                } else {
                  onInputChange("location", ""); // Clear for other service types
                }
              }}
              placeholder="Select service type"
              searchable={false}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          {(formData.serviceType === "repair" ||
            formData.serviceType === "multiple_work") && (
            <div className="space-y-2">
              <Label htmlFor="location" className="text-gray-300">
                Location Type *
              </Label>
              <SwitchToggle
                steps={[
                  { value: "shop", label: "Shop" },
                  { value: "home", label: "Other" },
                ]}
                value={formData.location || "shop"}
                onValueChange={(value) => onInputChange("location", value)}
                className="bg-gray-800 border-gray-700"
                trackClassName="bg-gray-700"
                thumbClassName="bg-white/20"
                labelClassName="text-sm text-white"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="billDate" className="text-gray-300">
              Bill Date *
            </Label>
            <Input
              id="billDate"
              type="date"
              value={formData.billDate}
              onChange={(e) => onInputChange("billDate", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-gray-300">
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => onInputChange("dueDate", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-gray-300">
            Notes
          </Label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => onInputChange("notes", e.target.value)}
            className="w-full h-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 resize-none focus:outline-none   focus:border-transparent"
            placeholder="Add any additional notes..."
          />
        </div>

        {/* Conditional charges based on service type and location */}
        {(formData.serviceType === "repair" ||
          formData.serviceType === "multiple_work") && (
          <div className="space-y-2">
            <Label htmlFor="repairFee" className="text-gray-300">
              Repair Charges ({currency})
            </Label>
            <Input
              id="repairFee"
              type="number"
              min="0"
              step="0.01"
              value={formData.repairFee || ""}
              onChange={(e) => onInputChange("repairFee", e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter repair charges"
            />
          </div>
        )}

        {(formData.serviceType === "repair" ||
          formData.serviceType === "multiple_work") &&
          formData.location === "home" && (
            <div className="space-y-2">
              <Label htmlFor="homeVisitFee" className="text-gray-300">
                Visit Fee ({currency})
              </Label>
              <Input
                id="homeVisitFee"
                type="number"
                min="50"
                max="200"
                step="1"
                value={formData.homeVisitFee || ""}
                onChange={(e) => onInputChange("homeVisitFee", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="50-200"
              />
              <p className="text-xs text-gray-400">Minimum ₹50, Maximum ₹200</p>
            </div>
          )}
      </CardContent>
    </Card>
  );
};
