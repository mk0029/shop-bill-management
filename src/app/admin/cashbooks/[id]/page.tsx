import { sanityClient } from "@/lib/sanity";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import CashbookActions from "@/components/cash-book/cashbook-actions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function CashbookDetailPage({ params }: PageProps) {
  const id =
    typeof params?.id === "string" ? decodeURIComponent(params.id) : "";
  if (!id) return notFound();

  const bookQuery = `*[_type == "customerCashbook" && _id == "${id}"][0]{
    _id,
    name,
    status,
    notes,
    customer->{ _id, name, phone }
  }`;
  const itemsQuery = `*[_type == "cashbookItem" && cashbook._ref == "${id}"] | order(createdAt asc)`;
  const [book, items] = await Promise.all([
    sanityClient.fetch(bookQuery),
    sanityClient.fetch(itemsQuery),
  ]);
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
            Customer: {book?.customer?.name || "Unknown"}
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
