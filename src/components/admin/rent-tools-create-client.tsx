"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sanityApiService } from "@/lib/sanity-api-service";
import {
  calculateExpectedReturnTime,
  calculateRentAmount,
  toolRentalService,
  type DurationType,
  type ToolItem,
} from "@/lib/tool-rental-service";
import { toast } from "sonner";
import { Dropdown } from "@/components/ui/dropdown";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";

function formatINR(value: number) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

export default function AdminRentToolsCreateClient() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [toolId, setToolId] = useState("");
  const [durationType, setDurationType] = useState<DurationType>("hour");
  const [durationValue, setDurationValue] = useState(1);
  const [depositAmount, setDepositAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [customerRes, toolsData] = await Promise.all([
          sanityApiService.users.getCustomers(),
          toolRentalService.getTools(),
        ]);
        setCustomers(customerRes.data || []);
        setTools((toolsData || []).filter((t) => t.isActive));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedCustomer = customers.find((c) => c._id === customerId);
  const selectedTool = tools.find((t) => t._id === toolId);
  const rentAmount = selectedTool
    ? calculateRentAmount(selectedTool, durationType, durationValue)
    : 0;
  const expectedReturnTime = calculateExpectedReturnTime(
    new Date().toISOString(),
    durationType,
    durationValue,
  );
  const totalAmount = rentAmount;
  const balanceDue = totalAmount - Number(paidAmount || 0);

  const clearForm = () => {
    setCustomerId("");
    setToolId("");
    setDurationType("hour");
    setDurationValue(1);
    setDepositAmount(0);
    setPaidAmount(0);
    setNotes("");
  };

  const onSubmit = async () => {
    try {
      if (!selectedCustomer) return toast.error("Customer is required");
      if (!selectedTool) return toast.error("Tool is required");
      if (durationValue <= 0)
        return toast.error("Duration must be greater than 0");
      if (!selectedCustomer.phone)
        return toast.error(
          "Customer phone is required for WhatsApp notification",
        );
      if (!selectedTool.isActive || selectedTool.availableQuantity <= 0)
        return toast.error("Tool is unavailable");
      if (paidAmount > totalAmount)
        return toast.error("Paid amount cannot be greater than total amount");

      setSaving(true);
      await toolRentalService.createToolRental({
        customer: selectedCustomer,
        tool: selectedTool,
        durationType,
        durationValue,
        paidAmount,
        notes,
        depositAmount,
        createdBy: selectedCustomer?._id,
      });

      toast.success("Tool given on rent successfully");
      clearForm();
      router.push("/admin/rent-tools");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create rental");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg sm:text-2xl font-bold text-white">New Rental</h1>
        <button
          type="button"
          onClick={() => router.push("/admin/rent-tools")}
          className="bg-gray-700 hover:bg-gray-600 text-white rounded px-3 py-2 text-sm sm:px-4 sm:py-2 transition-colors"
        >
          Back
        </button>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : (
          <>
            {/* Rental Information Section */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Details
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Customer *
                  </label>
                  <CustomerAutocomplete
                    customers={customers}
                    value={customerId}
                    onChange={setCustomerId}
                    placeholder="Type customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tool *
                  </label>
                  <Dropdown
                    options={tools.map((t) => ({
                      value: t._id,
                      label: `${t.toolName} (${t.availableQuantity} available)`,
                    }))}
                    value={toolId}
                    onValueChange={setToolId}
                    placeholder="Type tool name to search..."
                    searchable
                    searchPlaceholder="Search tools..."
                    removeSearchForce
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration Type *
                  </label>
                  <Dropdown
                    options={[
                      { value: "hour", label: "Hour" },
                      { value: "day", label: "Day" },
                    ]}
                    value={durationType}
                    onValueChange={(v) => setDurationType(v as DurationType)}
                    placeholder="Select duration"
                  />
                </div>
              </div>
            </div>

            {/* Duration & Pricing Section */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Duration & Price
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration Value *{" "}
                    <span className="text-xs text-gray-400">
                      ({durationType}s)
                    </span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={durationValue}
                    onChange={(e) =>
                      setDurationValue(Number(e.target.value || 1))
                    }
                    className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
                    placeholder="Enter duration"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount Paid{" "}
                    <span className="text-xs text-gray-400">
                      (Rs - Initial payment)
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value || 0))}
                    className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
                    placeholder="Enter amount paid upfront"
                  />
                </div>
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Notes
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes{" "}
                  <span className="text-xs text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full h-16 sm:h-20 resize-none"
                  placeholder="Enter any additional notes or special instructions"
                  rows={3}
                />
              </div>
            </div>

            {/* Rental Summary Section */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-white border-b border-gray-700 pb-2">
                Summary
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {selectedTool && (
                  <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-3 sm:p-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-2 sm:mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                      Tool Information
                    </h3>
                    <div className="space-y-1 sm:space-y-2">
                      <p className="text-sm text-white font-medium">
                        {selectedTool.toolName}
                      </p>
                      <p className="text-xs text-gray-400">
                        Code: {selectedTool.toolCode} | Category:{" "}
                        {selectedTool.category}
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-gray-400">
                        <span>
                          Hourly: {formatINR(selectedTool.rentPricePerHour)}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>
                          Daily: {formatINR(selectedTool.rentPricePerDay)}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>
                          Available: {selectedTool.availableQuantity}/
                          {selectedTool.totalQuantity}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-3 sm:p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2 sm:mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                    Return Details
                  </h3>
                  <div className="space-y-1 sm:space-y-2">
                    <p className="text-xs text-gray-400">
                      Duration: {durationValue} {durationType}
                      {durationValue > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      Expected Return:{" "}
                      {new Date(expectedReturnTime).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-3 sm:p-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2 sm:mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Payment Summary
                  </h3>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">
                        Rent Amount:
                      </span>
                      <span className="text-sm text-white font-medium">
                        {formatINR(rentAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-600">
                      <span className="text-sm text-gray-300 font-medium">
                        Total Payable:
                      </span>
                      <span className="text-sm text-blue-300 font-semibold">
                        {formatINR(totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">
                        Amount Paid:
                      </span>
                      <span className="text-sm text-white font-medium">
                        {formatINR(paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-600">
                      <span className="text-sm text-gray-300 font-medium">
                        Balance Due:
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          balanceDue <= 0 ? "text-green-300" : "text-orange-300"
                        }`}
                      >
                        {balanceDue <= 0 ? "Paid" : formatINR(balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 sm:pt-4 border-t border-gray-700 gap-3 sm:gap-0">
              <div className="text-sm text-gray-400 order-2 sm:order-1">
                <span className="text-red-400">*</span> Required fields
              </div>
              <div className="flex gap-2 sm:gap-3 order-1 sm:order-2">
                <button
                  type="button"
                  onClick={() => router.push("/admin/rent-tools")}
                  className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white rounded px-3 sm:px-4 py-2 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={onSubmit}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded px-3 sm:px-4 py-2 text-sm transition-colors font-medium"
                >
                  {saving ? "Processing..." : "Create"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
