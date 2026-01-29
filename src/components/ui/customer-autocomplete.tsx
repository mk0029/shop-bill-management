"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Customer {
  _id: string;
  name: string;
  phone?: string;
  location?: string;
}

interface Props {
  customers: Customer[];
  value: string; // selected customerId
  onChange: (id: string) => void;
  placeholder?: string;
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

  const selected = useMemo(
    () => customers.find((c) => c._id === value) || null,
    [customers, value],
  );

  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    return `${selected.name}${selected.phone ? ` • ${selected.phone}` : ""}`;
  }, [selected]);

  useEffect(() => {
    if (!value) {
      setQuery("");
      return;
    }

    if (selected) {
      setQuery(selectedLabel);
    }
  }, [value, selected, selectedLabel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as Customer[];
    return customers
      .filter((c) =>
        `${c.name} ${c.phone || ""} ${c.location || ""}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 10);
  }, [customers, query]);

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          if (value && next !== selectedLabel) {
            onChange("");
          }
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Type customer name"}
        className="bg-gray-800 border-gray-700 text-white"
      />
      {open && query.trim().length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-700 bg-gray-900 shadow-lg">
          <div className="max-h-52 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c._id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-200"
                onClick={() => {
                  onChange(c._id);
                  setQuery(`${c.name}${c.phone ? ` • ${c.phone}` : ""}`);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-400">
                  {c.phone || ""} {c.location ? `• ${c.location}` : ""}
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
