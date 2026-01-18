"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { sanityClient } from "@/lib/sanity";

interface Book {
  _id: string;
  name?: string;
  status?: string;
  notes?: string;
  updatedAt?: string;
  _updatedAt?: string;
  customer?: { _id: string; name?: string; phone?: string };
}

interface Props {
  initial: Book[];
}

export default function CashbooksRealtimeList({ initial }: Props) {
  const [books, setBooks] = useState<Book[]>(initial || []);

  useEffect(() => {
    const sub = sanityClient
      .listen(
        '*[_type == "customerCashbook"]{ _id, name, status, notes, updatedAt, _updatedAt, customer->{ _id, name, phone } }',
        {},
        { includeResult: true },
      )
      .subscribe((msg: any) => {
        const doc = msg.result as Book | undefined;
        if (!doc || !doc._id) return;
        setBooks((prev) => {
          const others = prev.filter((b) => b._id !== doc._id);
          const next = [doc, ...others];
          // sort by updated time desc
          return next.sort((a, b) => {
            const at = new Date(a.updatedAt || a._updatedAt || 0).getTime();
            const bt = new Date(b.updatedAt || b._updatedAt || 0).getTime();
            return bt - at;
          });
        });
      });

    return () => sub.unsubscribe();
  }, []);

  const content = useMemo(() => {
    if (!books || books.length === 0) {
      return <div className="text-gray-400">No cashbooks found.</div>;
    }
    return books.map((b) => (
      <Link key={b._id} href={`/admin/cashbooks/${b._id}`}>
        <Card className="cursor-pointer hover:bg-gray-800 transition-colors">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>{b.name || b.customer?.name || "Cashbook"}</span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  b.status === "open"
                    ? "bg-green-900 text-green-300"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {b.status || "open"}
              </span>
            </CardTitle>
            <div className="text-gray-400 text-sm">
              Customer: {b.customer?.name || "Unknown"}{" "}
              {b.customer?.phone ? `• ${b.customer.phone}` : ""}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              Updated{" "}
              {new Date(
                b.updatedAt || b._updatedAt || Date.now(),
              ).toLocaleString()}
            </div>
          </CardHeader>
        </Card>
      </Link>
    ));
  }, [books]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {content}
    </div>
  );
}
