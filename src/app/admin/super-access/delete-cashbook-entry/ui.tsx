"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Dropdown } from "@/components/ui/dropdown";
import { sanityApiService } from "@/lib/sanity-api-service";

export default function DeleteCashbookEntryClient() {
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entryId, setEntryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canDelete = !!entryId.trim();

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

  const doDelete = async () => {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(
        `/api/super/cashbook/${encodeURIComponent(entryId.trim())}`,
        {
          method: "DELETE",
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }
      setMsg("Cashbook entry deleted");
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Delete Cashbook Entry</h1>
        <p className="text-gray-400 text-sm">
          Delete a cashbook entry by document _id.
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Dropdown
            options={entryOptions}
            value={entryId}
            onValueChange={setEntryId}
            placeholder={
              entriesLoading
                ? "Loading entries..."
                : "Search cashbook entry by date / amount / user / bill"
            }
            searchable
            searchPlaceholder="Type to search..."
          />
          <Button
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={!canDelete || loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </Button>

          {msg ? <div className="text-green-400 text-sm">{msg}</div> : null}
          {err ? <div className="text-red-400 text-sm">{err}</div> : null}
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await doDelete();
        }}
        title="Delete cashbook entry?"
        message="This action cannot be undone."
        type="confirm"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
