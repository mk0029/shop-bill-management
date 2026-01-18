"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCustomers } from "@/hooks/use-sanity-data";
import { customerCashbookService } from "@/lib/customer-cashbook-service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select";
import { toast } from "sonner";

export default function CreateCashbookForm() {
  const router = useRouter();
  const { customers, isLoading } = useCustomers();
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success("Cashbook created");
      router.push(`/admin/cashbooks/${res.data._id}`);
    } catch (err) {
      toast.error("Failed to create cashbook");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="bg-gray-900 rounded-lg p-4 space-y-3">
      <h2 className="text-white font-semibold">Create Cashbook</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-gray-300">Customer</Label>
          <SelectField
            value={customerId}
            onValueChange={setCustomerId}
            placeholder={isLoading ? "Loading..." : "Select customer"}
            options={customers.map((c) => ({
              label: `${c.name}${c.phone ? ` • ${c.phone}` : ""}`,
              value: c._id,
            }))}
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
        <div className="space-y-1 md:col-span-1 md:self-end">
          <Button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full md:w-auto"
          >
            {submitting ? "Creating..." : "+ Create"}
          </Button>
        </div>
        <div className="space-y-1 md:col-span-3">
          <Label className="text-gray-300">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any notes..."
          />
        </div>
      </div>
    </form>
  );
}
