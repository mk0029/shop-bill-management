import React from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { User, MapPin } from "lucide-react";
import { Customer } from "@/types";

interface CustomerSelectionProps {
  customers: Customer[];
  selectedCustomerId: string;
  onCustomerChange: (customerId: string) => void;
}

export function CustomerSelection({
  customers,
  selectedCustomerId,
  onCustomerChange,
}: CustomerSelectionProps) {
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Customer
      </label>
      <Dropdown
        options={customers.map((c) => ({
          value: c.id,
          label: `${c.name} - ${c.phone}`,
        }))}
        value={selectedCustomerId}
        onValueChange={onCustomerChange}
        placeholder="Select Customer"
      />
      {selectedCustomer && (
        <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <User className="w-4 h-4" />
            {selectedCustomer.name}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="w-4 h-4" />
            {selectedCustomer.location}
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerSelection;
