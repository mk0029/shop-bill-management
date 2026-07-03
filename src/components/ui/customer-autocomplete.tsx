"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { safeUserName } from "@/lib/display-text";
import { getAdminCustomerDisplayName } from "@/lib/customer-utils";

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  location?: string;
  role?: string;
  userRole?: string;
  accountType?: string;
  type?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
}

interface Props {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

function isCustomer(user: Customer): boolean {
  const role = String(
    user.role || user.userRole || user.accountType || user.type || "",
  ).toLowerCase();
  if (role === "customer") return true;
  if (user.isAdmin === true || user.isSuperAdmin === true) return false;
  return false;
}

function customerLabel(customer: Customer) {
  const name = safeUserName(getAdminCustomerDisplayName(customer), "Customer");
  return `${name}${customer.phone ? ` • ${customer.phone}` : ""}`;
}

export default function CustomerAutocomplete({
  customers,
  value,
  onChange,
  placeholder,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const validCustomers = useMemo(
    () => customers.filter(isCustomer),
    [customers],
  );

  const selected = useMemo(
    () => validCustomers.find((customer) => customer._id === value) || null,
    [validCustomers, value],
  );
  const selectedLabel = useMemo(
    () => (selected ? customerLabel(selected) : ""),
    [selected],
  );

  useEffect(() => {
    if (!value) {
      setQuery("");
      return;
    }
    if (selected) setQuery(selectedLabel);
  }, [selected, selectedLabel, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Customer[];
    return validCustomers
      .filter((customer) =>
        `${customer.name} ${customer.phone || ""} ${customer.location || ""}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 10);
  }, [validCustomers, query]);

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          if (value && next !== selectedLabel) onChange("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Type customer name"}
        className="bg-gray-800 border-gray-700 text-white"
      />
      {open && query.trim().length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-600 bg-gray-800/95 backdrop-blur-md shadow-xl">
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((customer) => (
              <button
                key={customer._id}
                type="button"
                className="w-full px-3 py-2 text-left text-gray-200 hover:bg-gray-700"
                onClick={() => {
                  onChange(customer._id);
                  setQuery(customerLabel(customer));
                  setOpen(false);
                }}
              >
                <div className="font-medium">
                  {safeUserName(getAdminCustomerDisplayName(customer), "Customer")}
                </div>
                <div className="text-xs text-gray-400">
                  {customer.phone || ""}{" "}
                  {customer.location ? `• ${customer.location}` : ""}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-3 text-sm text-gray-400">
                No matching customer
              </div>
            )}
          </div>
          {filtered.length === 0 && (
            <div className="flex items-center justify-between border-t border-gray-700 p-2">
              <div className="text-xs text-gray-400">
                Can't find the customer?
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => router.push("/admin/customers/add")}
              >
                Add Customer
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
