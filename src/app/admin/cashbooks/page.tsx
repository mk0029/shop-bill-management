import Link from "next/link";
import { sanityClient } from "@/lib/sanity";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CreateBookButton from "@/components/cash-book/create-book-button";
import CashbooksRealtimeList from "@/components/cash-book/cashbooks-realtime-list";

export const dynamic = "force-dynamic";

async function getAllCashbooks() {
  const query = `*[_type == "customerCashbook"] | order(updatedAt desc) {
    _id,
    name,
    status,
    notes,
    updatedAt,
    customer->{ _id, name, phone }
  }`;
  const books = await sanityClient.fetch(query);
  return Array.isArray(books) ? books : [];
}

export default async function CashbooksIndexPage() {
  const books = await getAllCashbooks();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
          Customer Cashbooks
        </h1>
        <Link href="/admin/cash-book">
          <Button variant="secondary">Back to Cash Book</Button>
        </Link>
      </div>

      <CreateBookButton />

      <CashbooksRealtimeList initial={books} />
    </div>
  );
}
