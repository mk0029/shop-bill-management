"use client";

import { useState } from "react";
import { Dropdown } from "./dropdown";

// Test component to verify dropdown functionality
export function DropdownTest() {
  const [selectedValue, setSelectedValue] = useState("");

  const testOptions = [
    { value: "1", label: "John Doe (123-456-7890) - New York" },
    { value: "2", label: "Jane Smith (098-765-4321) - Los Angeles" },
    { value: "3", label: "Mike Johnson (555-123-4567) - Chicago" },
    { value: "4", label: "Sarah Wilson (777-888-9999) - Miami" },
    { value: "5", label: "David Brown (111-222-3333) - Seattle" },
    { value: "6", label: "Emily Davis (444-555-6666) - Boston" },
    { value: "7", label: "Chris Miller (999-888-7777) - Denver" },
    { value: "8", label: "Lisa Anderson (333-444-5555) - Phoenix" },
  ];

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Dropdown Test</h1>

        <div className="space-y-2">
          <label className="text-gray-300 text-sm font-medium">
            Select Customer (Searchable)
          </label>
          <Dropdown
            options={testOptions}
            value={selectedValue}
            onValueChange={setSelectedValue}
            placeholder="Choose a customer..."
            searchable={true}
            searchPlaceholder="Search customers..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-gray-300 text-sm font-medium">
            Service Type (Non-searchable)
          </label>
          <Dropdown
            options={[
              { value: "sale", label: "Sale" },
              { value: "repair", label: "Repair" },
              { value: "custom", label: "Custom" },
            ]}
            value=""
            onValueChange={() => {}}
            placeholder="Select service type"
            searchable={false}
          />
        </div>

        {selectedValue && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-white">
              Selected:{" "}
              {testOptions.find((o) => o.value === selectedValue)?.label}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
