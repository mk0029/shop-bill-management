"use client";

import { useRouter } from "next/navigation";
import AddNoteItem from "./add-note-item";

export default function CashbookActions({
  cashbookId,
  customerId,
}: {
  cashbookId: string;
  customerId?: string;
}) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <AddNoteItem
        cashbookId={cashbookId}
        customerId={customerId}
        onAdded={() => router.refresh()}
      />
    </div>
  );
}
