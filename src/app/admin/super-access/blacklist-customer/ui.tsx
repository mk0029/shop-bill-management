"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { useCustomers } from "@/hooks/use-sanity-data";

export default function BlacklistCustomerClient() {
  const { customers, isLoading: customersLoading } = useCustomers();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetActive, setTargetActive] = useState<boolean>(true);

  const submit = async (isActive: boolean) => {
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(
        `/api/super/users/${encodeURIComponent(userId.trim())}/blacklist`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }
      setMsg(
        isActive
          ? "Customer unblocked (isActive=true)"
          : "Customer blocked (isActive=false)",
      );
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const canAct = !!userId.trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Blacklist Customer</h1>
        <p className="text-gray-400 text-sm">
          Block/unblock a customer by setting `isActive`.
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CustomerAutocomplete
            customers={customers}
            value={userId}
            onChange={setUserId}
            placeholder={
              customersLoading ? "Loading customers..." : "Type customer name"
            }
          />

          <div className="flex gap-3">
            <Button
              variant="destructive"
              disabled={!canAct || loading}
              onClick={() => {
                setTargetActive(false);
                setConfirmOpen(true);
              }}
              className="flex-1"
            >
              Block
            </Button>
            <Button
              disabled={!canAct || loading}
              onClick={() => {
                setTargetActive(true);
                setConfirmOpen(true);
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Unblock
            </Button>
          </div>

          {msg ? <div className="text-green-400 text-sm">{msg}</div> : null}
          {err ? <div className="text-red-400 text-sm">{err}</div> : null}
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await submit(targetActive);
        }}
        title={targetActive ? "Unblock customer?" : "Block customer?"}
        message={
          targetActive
            ? "This will set isActive=true"
            : "This will set isActive=false"
        }
        type="confirm"
        confirmText={targetActive ? "Unblock" : "Block"}
        cancelText="Cancel"
      />
    </div>
  );
}
