"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import SuperBillUpdateModal from "@/components/super-access/SuperBillUpdateModal";
import { Dropdown } from "@/components/ui/dropdown";
import { sanityApiService } from "@/lib/sanity-api-service";

export default function SuperAccessUpdateBillsClient() {
  const [bills, setBills] = useState<any[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bill, setBill] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setBillsLoading(true);
      try {
        const res = await sanityApiService.bills.getAllBills();
        if (res.success && Array.isArray(res.data)) {
          setBills(res.data);
        }
      } finally {
        setBillsLoading(false);
      }
    };
    load();
  }, []);

  const billOptions = useMemo(() => {
    return (bills || []).slice(0, 500).map((b: any) => {
      const billNo = String(b?.billNumber || b?.billId || b?._id || "");
      const customerName = String(b?.customer?.name || "");
      const phone = String(b?.customer?.phone || "");
      const label = `${billNo}${customerName ? ` • ${customerName}` : ""}${phone ? ` • ${phone}` : ""}`;
      return { value: String(b?._id), label };
    });
  }, [bills]);

  useEffect(() => {
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBillId]);

  const canOpen = useMemo(() => !!selectedBillId.trim(), [selectedBillId]);

  const fetchBill = async () => {
    if (!canOpen) return;
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching bill with ID:", selectedBillId.trim());
      const res = await fetch(
        `/api/super/bills/${encodeURIComponent(selectedBillId.trim())}`,
        { cache: "no-store" },
      );
      console.log("Response status:", res.status);
      const json = await res.json().catch(() => ({}));
      console.log("Response data:", json);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }
      setBill(json?.data);
      setOpen(true);
    } catch (e: any) {
      console.error("Fetch bill error:", e);
      setError(e?.message || "Failed to load bill");
    } finally {
      setLoading(false);
    }
  };

  const deleteBill = async () => {
    if (!canOpen) return;

    setDeleting(true);
    setError(null);
    try {
      console.log("Deleting bill with ID:", selectedBillId.trim());
      const res = await fetch(
        `/api/super/bills/${encodeURIComponent(selectedBillId.trim())}`,
        {
          method: "DELETE",
          cache: "no-store",
        },
      );
      console.log("Delete response status:", res.status);
      const json = await res.json().catch(() => ({}));
      console.log("Delete response data:", json);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Failed to delete (${res.status})`);
      }

      // Success: reset form and refresh bills list
      setSelectedBillId("");
      setBill(null);
      setError(null);

      // Refresh bills list
      const load = async () => {
        setBillsLoading(true);
        try {
          const res = await sanityApiService.bills.getAllBills();
          if (res.success && Array.isArray(res.data)) {
            setBills(res.data);
          }
        } finally {
          setBillsLoading(false);
        }
      };
      load();

      // Show success modal instead of alert
      setSuccessMessage("Bill deleted successfully!");
      setShowSuccessModal(true);
    } catch (e: any) {
      console.error("Delete bill error:", e);
      setError(e?.message || "Failed to delete bill");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Update Bills</h1>
        <p className="text-gray-400 text-sm">
          Open any bill by ID and update using a separate editor.
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Open Bill</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Dropdown
            options={billOptions}
            value={selectedBillId}
            onValueChange={(v) => {
              setSelectedBillId(v);
              setError(null);
            }}
            placeholder={
              billsLoading
                ? "Loading bills..."
                : "Search bill by number / customer / phone"
            }
            searchable
            searchPlaceholder="Type bill number / customer / phone"
          />
          <div className="flex gap-3">
            <Button
              onClick={fetchBill}
              disabled={!canOpen || loading || deleting}
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
            >
              {loading ? "Loading..." : "Open Editor"}
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canOpen || loading || deleting}
              className="bg-red-600 hover:bg-red-700 text-white flex-1"
            >
              {deleting ? "Deleting..." : "Delete Bill"}
            </Button>
          </div>
          {error ? <div className="text-red-400 text-sm">{error}</div> : null}
        </CardContent>
      </Card>

      {bill && (
        <SuperBillUpdateModal
          isOpen={open}
          onClose={() => setOpen(false)}
          billId={bill._id}
          initialBill={bill}
          onSaved={(u) => {
            setBill(u);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await deleteBill();
        }}
        title="Delete bill?"
        message="This action cannot be undone and will remove all references to this bill."
        type="confirm"
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ConfirmationModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
        }}
        onConfirm={() => {
          setShowSuccessModal(false);
        }}
        title="Success"
        message={successMessage}
        type="success"
      />
    </div>
  );
}
