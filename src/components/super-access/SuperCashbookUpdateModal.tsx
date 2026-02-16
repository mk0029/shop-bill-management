"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

function mapCashbookEntryToFormData(entry: any): Partial<any> {
  return {
    amount: Number(entry?.amount || 0),
    type: String(entry?.type || "credit"),
    description: String(entry?.description || ""),
    date: entry?.date
      ? String(entry.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    paymentMethod: String(entry?.paymentMethod || "cash"),
    reference: String(entry?.reference || ""),
    notes: String(entry?.notes || ""),
  };
}

export default function SuperCashbookUpdateModal(props: {
  isOpen: boolean;
  onClose: () => void;
  entryId: string;
  initialEntry: any;
  onSaved?: (updated: any) => void;
}) {
  const { isOpen, onClose, entryId, initialEntry, onSaved } = props;

  const [formData, setFormData] = useState<Partial<any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const mapped = mapCashbookEntryToFormData(initialEntry);
    setFormData(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, entryId]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        amount: Number(formData.amount || 0),
        type: String(formData.type || "credit"),
        description: String(formData.description || ""),
        date: String(formData.date || new Date().toISOString().slice(0, 10)),
        paymentMethod: String(formData.paymentMethod || "cash"),
        reference: String(formData.reference || ""),
        notes: String(formData.notes || ""),
      };

      const res = await fetch(
        `/api/super/cashbook/${encodeURIComponent(String(entryId))}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }
      onSaved?.(json?.data);
      setShowSuccessModal(true);
    } catch (e: any) {
      try {
        setAlertMessage(e?.message || "Failed to update cashbook entry");
        setShowAlertModal(true);
      } catch {}
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Update Cashbook Entry">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (₹)
            </label>
            <input
              type="number"
              value={formData.amount || ""}
              onChange={(e) => handleInputChange("amount", Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type
            </label>
            <select
              value={formData.type || "credit"}
              onChange={(e) => handleInputChange("type", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="credit">Credit (Income)</option>
              <option value="debit">Debit (Expense)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date || ""}
              onChange={(e) => handleInputChange("date", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Method
            </label>
            <select
              value={formData.paymentMethod || "cash"}
              onChange={(e) => handleInputChange("paymentMethod", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <input
              type="text"
              value={formData.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter description"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reference
            </label>
            <input
              type="text"
              value={formData.reference || ""}
              onChange={(e) => handleInputChange("reference", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bill number, receipt number, etc."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <Button
            onClick={onClose}
            disabled={isSaving}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? "Updating..." : "Update Entry"}
          </Button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          onClose();
        }}
        onConfirm={() => {
          setShowSuccessModal(false);
          onClose();
        }}
        title="Cashbook entry updated"
        message="Cashbook entry updated successfully."
        type="success"
      />

      <ConfirmationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        onConfirm={() => setShowAlertModal(false)}
        title="Alert"
        message={alertMessage}
        type="alert"
      />
    </Modal>
  );
}
