"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as toolRentalApi from "@/lib/tool-rental-api";
import type { ToolItem } from "@/lib/tool-rental-service";
import { toast } from "sonner";
import { Dropdown } from "@/components/ui/dropdown";

const emptyForm: Partial<ToolItem> = {
  toolName: "",
  toolCode: "",
  category: "",
  description: "",
  rentPricePerHour: 0,
  rentPricePerDay: 0,
  depositAmount: 0,
  availableQuantity: 0,
  totalQuantity: 0,
  isActive: true,
};

export default function AdminToolsCreateClient() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ToolItem>>(emptyForm);
  const [existingTools, setExistingTools] = useState<ToolItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const tools = await toolRentalApi.getTools();
        setExistingTools(tools || []);

        // Extract unique categories from existing tools
        const uniqueCategories = [
          ...new Set(tools.map((t) => t.category).filter(Boolean)),
        ];
        setCategories(uniqueCategories);
      } catch (e) {
        console.error("Failed to load existing data:", e);
      }
    };

    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, []);

  const submit = async () => {
    try {
      if (!form.toolName?.trim()) return toast.error("Tool name is required");
      if (!form.toolCode?.trim()) return toast.error("Tool code is required");
      if (!form.category?.trim()) return toast.error("Category is required");
      if (!form.rentPricePerHour || form.rentPricePerHour < 0)
        return toast.error("Hourly rent price is required");
      if (!form.rentPricePerDay || form.rentPricePerDay < 0)
        return toast.error("Daily rent price is required");
      if (!form.totalQuantity || form.totalQuantity < 1)
        return toast.error("Total quantity must be at least 1");
      if (form.availableQuantity === undefined || form.availableQuantity < 0)
        return toast.error("Available quantity is required");

      setSaving(true);
      await toolRentalApi.createTool({
        toolName: form.toolName,
        toolCode: form.toolCode,
        category: form.category,
        description: form.description || "",
        rentPricePerHour: form.rentPricePerHour,
        rentPricePerDay: form.rentPricePerDay,
        depositAmount: form.depositAmount || 0,
        totalQuantity: form.totalQuantity,
        availableQuantity: form.availableQuantity,
        isActive: form.isActive ?? true,
      });

      toast.success("Tool added successfully");
      router.push("/admin/tools");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add tool");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-bold text-white">Add Tool</h1>
        <button
          type="button"
          onClick={() => router.push("/admin/tools")}
          className="bg-gray-700 hover:bg-gray-600 text-white rounded px-3 py-2 text-sm sm:px-4 sm:py-2 transition-colors"
        >
          Back
        </button>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 sm:p-6 space-y-4 sm:space-y-6">
        <h2 className="text-base sm:text-lg font-semibold text-white border-b border-gray-700 pb-2">
          Details
        </h2>

        {/* Basic Information Section */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm sm:text-md font-medium text-gray-300">
            Basic
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tool Name *
              </label>
              <input
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
                placeholder="e.g., Hammer Drill"
                value={form.toolName || ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, toolName: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tool Code *
              </label>
              <input
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
                placeholder="e.g., HD001"
                value={form.toolCode || ""}
                onChange={(e) =>
                  setForm((s) => ({ ...s, toolCode: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category *
              </label>
              <Dropdown
                options={[
                  ...categories.map((cat) => ({ value: cat, label: cat })),
                  { value: "Drill", label: "Drill" },
                  { value: "Saw", label: "Saw" },
                  { value: "Grinder", label: "Grinder" },
                  { value: "Hammer", label: "Hammer" },
                  { value: "Wrench", label: "Wrench" },
                  { value: "Screwdriver", label: "Screwdriver" },
                  { value: "Pliers", label: "Pliers" },
                  { value: "Measuring Tools", label: "Measuring Tools" },
                  { value: "Other", label: "Other" },
                ]}
                value={form.category || ""}
                onValueChange={(value) =>
                  setForm((s) => ({ ...s, category: value }))
                }
                placeholder="Select category"
                searchable
                searchPlaceholder="Search categories..."
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full h-16 sm:h-20 resize-none"
              placeholder="Brief description of the tool (optional)"
              value={form.description || ""}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
              rows={3}
            />
          </div>
        </div>

        {/* Pricing Section */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm sm:text-md font-medium text-gray-300">
            Pricing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rent Price Per Hour (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="10"
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
                placeholder="0"
                value={form.rentPricePerHour ?? 0}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    rentPricePerHour: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rent Price Per Day (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="50"
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
                placeholder="0"
                value={form.rentPricePerDay ?? 0}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    rentPricePerDay: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Security Deposit (₹)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
                placeholder="0"
                value={form.depositAmount ?? 0}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    depositAmount: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* Inventory Section */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-sm sm:text-md font-medium text-gray-300">
            Stock
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Total Quantity *
              </label>
              <input
                type="number"
                min="1"
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
                placeholder="1"
                value={form.totalQuantity ?? 0}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    totalQuantity: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Available Quantity *
              </label>
              <input
                type="number"
                min="0"
                className="bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white w-full"
                placeholder="0"
                value={form.availableQuantity ?? 0}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    availableQuantity: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* Status and Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 sm:pt-4 border-t border-gray-700 gap-3 sm:gap-0">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            <label className="text-sm text-gray-300 flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) =>
                  setForm((s) => ({ ...s, isActive: e.target.checked }))
                }
              />
              Active
            </label>
            <div className="text-sm text-gray-400">
              <span className="text-red-400">*</span> Required fields
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 order-1 sm:order-2">
            <button
              type="button"
              onClick={() => router.push("/admin/tools")}
              className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white rounded px-3 sm:px-4 py-2 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={submit}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded px-3 sm:px-4 py-2 text-sm transition-colors font-medium"
            >
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
