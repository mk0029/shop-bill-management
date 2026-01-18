"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import CustomerAutocomplete from "@/components/ui/customer-autocomplete";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers } from "@/hooks/use-sanity-data";
import { customerCashbookService } from "@/lib/customer-cashbook-service";
import { sanityClient } from "@/lib/sanity";
import { toast } from "sonner";

export default function CreateBookButton() {
  const router = useRouter();
  const { customers, isLoading } = useCustomers();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onCreate = async () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a cashbook name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await customerCashbookService.createCashbook({
        customerId,
        name: name.trim(),
        notes,
      });
      if (!res.success || !res.data?._id) {
        toast.error(res.error || "Failed to create cashbook");
        setSubmitting(false);
        return;
      }
      const newId = res.data._id as string;
      toast.success("Cashbook created");
      setOpen(false);

      // Poll for read consistency to avoid immediate 404 on the detail page
      const start = Date.now();
      let found = false;
      while (Date.now() - start < 2500) {
        try {
          const exists = await sanityClient.fetch(
            `*[_type == "customerCashbook" && _id == $id][0]._id`,
            { id: newId },
          );
          if (exists) {
            found = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 200));
      }

      if (found) {
        router.push(`/admin/cashbooks/${newId}`);
      } else {
        // Fallback: go to list, realtime will surface the new book immediately
        router.push(`/admin/cashbooks`);
      }
    } catch (e) {
      toast.error("Failed to create cashbook");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <Button onClick={() => setOpen(true)}>Create Book</Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Create Cashbook"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-gray-300">Customer</Label>
            <CustomerAutocomplete
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
              placeholder={
                isLoading ? "Loading customers..." : "Type customer name"
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Cashbook Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. RK Wiring Project"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={submitting || isLoading}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
