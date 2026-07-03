"use client";

import { useEffect, useState } from "react";
import { sanityClient } from "@/lib/sanity";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CashbookActions from "@/components/cash-book/cashbook-actions";
import { getAdminCustomerDisplayName } from "@/lib/customer-utils";

interface Props {
  id: string;
}

export default function CashbookDetailClient({ id }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const bookQuery = `*[_type == "customerCashbook" && (_id == $id || _id == $draftId)][0]{
          _id,
          name,
          status,
          notes,
          customer->{ _id, name, phone }
        }`;
        const b = await sanityClient.fetch(bookQuery, {
          id,
          draftId: `drafts.${id}`,
        });
        if (!alive) return;
        if (!b?._id) {
          setError("Cashbook not found or not visible yet.");
          setLoading(false);
          return;
        }
        setBook(b);
        const itemsQuery = `*[_type == "cashbookItem" && cashbook._ref == $ref] | order(createdAt asc)`;
        const its = await sanityClient.fetch(itemsQuery, { ref: b._id });
        if (!alive) return;
        setItems(Array.isArray(its) ? its : []);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        setError("Failed to load cashbook.");
        setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return <div className="text-gray-400">Loading cashbook…</div>;
  }
  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-red-300 text-sm">{error}</div>
        <div className="flex gap-2">
          <Link href="/admin/cashbooks">
            <Button variant="secondary">All Books</Button>
          </Link>
          <Link href="/admin/cash-book">
            <Button variant="ghost">Cash Book</Button>
          </Link>
        </div>
      </div>
    );
  }

  const pending = items.filter((i) => !i.bill);
  const billed = items.filter((i) => i.bill);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            {book?.name || "Cashbook"}
          </h1>
          <p className="text-gray-400 text-sm">
            Customer: {getAdminCustomerDisplayName(book?.customer || {}) || "Unknown"}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {book?._id && (
            <CashbookActions
              cashbookId={book._id}
              customerId={book?.customer?._id}
            />
          )}
          <Link href="/admin/cashbooks">
            <Button variant="secondary">All Books</Button>
          </Link>
          <Link href="/admin/cash-book">
            <Button variant="ghost">Cash Book</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-lg p-4">
          <h2 className="text-white font-semibold mb-3">Pending Items</h2>
          {pending.length === 0 && (
            <div className="text-gray-400 text-sm">No pending items</div>
          )}
          <ul className="divide-y divide-gray-800">
            {pending.map((it) => (
              <li
                key={it._id}
                className="py-3 flex items-center justify-between"
              >
                <div className="text-gray-200">
                  <div className="font-medium">{it.itemName}</div>
                  <div className="text-xs text-gray-400">
                    {it.quantity} × ₹{it.unitPrice} • ₹{it.totalPrice}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(it.createdAt || it._createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <h2 className="text-white font-semibold mb-3">Billed Items</h2>
          {billed.length === 0 && (
            <div className="text-gray-400 text-sm">No billed items</div>
          )}
          <ul className="divide-y divide-gray-800">
            {billed.map((it) => (
              <li
                key={it._id}
                className="py-3 flex items-center justify-between opacity-70"
              >
                <div className="text-gray-200">
                  <div className="font-medium">{it.itemName}</div>
                  <div className="text-xs text-gray-400">
                    {it.quantity} × ₹{it.unitPrice} • ₹{it.totalPrice}
                  </div>
                </div>
                <div className="text-xs text-gray-500">Locked</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
