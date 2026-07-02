import React, { useMemo } from "react";
import { Dropdown } from "@/components/ui/dropdown";
import { User, MapPin } from "lucide-react";
import { Customer } from "@/types";
import { safeUserName } from "@/lib/display-text";

interface CustomerSelectionProps {
  customers: Customer[];
  selectedCustomerId: string;
  onCustomerChange: (customerId: string) => void;
}

function isCustomer(user: Customer): boolean {
  const role = String(
    (user as any).role || (user as any).userRole || (user as any).accountType || (user as any).type || "",
  ).toLowerCase();
  if (role === "customer") return true;
  if ((user as any).isAdmin === true || (user as any).isSuperAdmin === true) return false;
  return false;
}

export function CustomerSelection({
  customers,
  selectedCustomerId,
  onCustomerChange,
}: CustomerSelectionProps) {
  const validCustomers = useMemo(() => customers.filter(isCustomer), [customers]);
  const selectedCustomer = validCustomers.find((c) => c._id === selectedCustomerId);

  return (
    <div>
      <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
        Customer
      </label>
      <Dropdown
        options={validCustomers.map((c) => ({
          value: c._id,
          label: `${safeUserName(c.name, "Customer")} - ${c.phone}`,
        }))}
        value={selectedCustomerId}
        onValueChange={onCustomerChange}
        placeholder="Select Customer"
      />
      {selectedCustomer && (
        <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{safeUserName(selectedCustomer.name, "Customer")}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{selectedCustomer.location}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerSelection;
