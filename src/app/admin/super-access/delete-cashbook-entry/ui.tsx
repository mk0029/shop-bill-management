"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Dropdown } from "@/components/ui/dropdown";
import { sanityApiService } from "@/lib/sanity-api-service";
import SuperCashbookUpdateModal from "@/components/super-access/SuperCashbookUpdateModal";

export default function SuperAccessCashbookClient() {
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entryId, setEntryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const canOpen = !!entryId.trim();

  useEffect(() => {
    const load = async () => {
      setEntriesLoading(true);
      try {
        const res = await sanityApiService.cashBook.getAllEntries();
        if (res.success && Array.isArray(res.data)) {
          setEntries(res.data);
        }
      } finally {
        setEntriesLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  const entryOptions = useMemo(() => {
    return (entries || []).slice(0, 500).map((e: any) => {
      const amount = Number(e?.amount || 0);
      const type = String(e?.type || "");
      const userName = String(e?.user?.name || e?.userName || "");
      const billNo = String(e?.bill?.billNumber || "");
      const createdAt = String(e?.createdAt || e?._createdAt || "").slice(
        0,
        10,
      );
      const label = `${createdAt} • ${type} • ₹${amount}${userName ? ` • ${userName}` : ""}${billNo ? ` • ${billNo}` : ""}`;
      return { value: String(e?._id), label };
    });
  }, [entries]);

  const fetchEntry = async () => {
    if (!canOpen) return;
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching cashbook entry with ID:", entryId.trim());
      const res = await fetch(
        `/api/super/cashbook/${encodeURIComponent(entryId.trim())}`,
        { cache: "no-store" },
      );
      console.log("Response status:", res.status);
      const json = await res.json().catch(() => ({}));
      console.log("Response data:", json);
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }
      setEntry(json?.data);
      setOpen(true);
    } catch (e: any) {
      console.error("Fetch entry error:", e);
      setError(e?.message || "Failed to load cashbook entry");
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async () => {
    if (!canOpen) return;

    setDeleting(true);
    setError(null);
    try {
      console.log("Deleting cashbook entry with ID:", entryId.trim());
      const res = await fetch(
        `/api/super/cashbook/${encodeURIComponent(entryId.trim())}`,
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

      // Success: reset form and refresh entries list
      setEntryId("");
      setEntry(null);
      setError(null);

      // Refresh entries list
      const load = async () => {
        setEntriesLoading(true);
        try {
          const res = await sanityApiService.cashBook.getAllEntries();
          if (res.success && Array.isArray(res.data)) {
            setEntries(res.data);
          }
        } finally {
          setEntriesLoading(false);
        }
      };
      load();

      // Show success modal instead of alert
      setSuccessMessage("Cashbook entry deleted successfully!");
      setShowSuccessModal(true);
    } catch (e: any) {
      console.error("Delete entry error:", e);
      setError(e?.message || "Failed to delete cashbook entry");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Update Cashbook Entries
        </h1>
        <p className="text-gray-400 text-sm">
          Open any cashbook entry by ID and update using a separate editor.
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Open Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Dropdown
            options={entryOptions}
            value={entryId}
            onValueChange={(v) => {
              setEntryId(v);
              setError(null);
            }}
            placeholder={
              entriesLoading
                ? "Loading entries..."
                : "Search cashbook entry by date / amount / user / bill"
            }
            searchable
            searchPlaceholder="Type to search..."
          />
          <div className="flex gap-3">
            <Button
              onClick={fetchEntry}
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
              {deleting ? "Deleting..." : "Delete Entry"}
            </Button>
          </div>
          {error ? <div className="text-red-400 text-sm">{error}</div> : null}
        </CardContent>
      </Card>

      {entry && (
        <SuperCashbookUpdateModal
          isOpen={open}
          onClose={() => setOpen(false)}
          entryId={entry._id}
          initialEntry={entry}
          onSaved={(u) => {
            setEntry(u);
          }}
        />
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await deleteEntry();
        }}
        title="Delete cashbook entry?"
        message="This action cannot be undone and will remove all references to this entry."
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
