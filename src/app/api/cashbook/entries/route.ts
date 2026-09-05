import { NextRequest, NextResponse } from "next/server";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { getReadableDatabases } from "@/lib/sanity/database-registry";

export const runtime = "nodejs";

const ENTRY_PROJECTION = `{
  _id,
  _createdAt,
  createdAt,
  updatedAt,
  user,
  userName,
  amount,
  totalAmount,
  pendingAmount,
  receivedAmount,
  type,
  source,
  category,
  notes,
  customerName,
  customerId,
  isCustomName,
  status,
  createdBy,
  bill,
  billCount,
  fullyPaidCount,
  partialCount,
  appliedBills[]{
    billNumber,
    appliedAmount,
    status,
    billRefId,
    billRef->{
      _id,
      billNumber
    }
  },
  user->{
    _id,
    name,
    phone,
    email
  },
  bill->{
    _id,
    billNumber,
    customer->{
      _id,
      name
    }
  }
}`;

interface CashBookEntryRow {
  _id: string;
  _createdAt: string;
  createdAt?: string;
  updatedAt?: string;
  userName?: string;
  amount: number;
  totalAmount?: number;
  pendingAmount?: number;
  receivedAmount?: number;
  type: "credit" | "debit";
  source: string;
  customerName?: string;
  customerId?: string | null;
  isCustomName?: boolean;
  status?: "completed" | "partial";
  createdBy?: string;
  bill?: {
    _id: string;
    billNumber: string;
    customer?: { _id: string; name: string };
  };
  user?: {
    _id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  databaseKey?: string;
}

function sortByCreatedDesc(a: CashBookEntryRow, b: CashBookEntryRow) {
  const ta = new Date(a.createdAt || a._createdAt || 0).getTime();
  const tb = new Date(b.createdAt || b._createdAt || 0).getTime();
  return tb - ta;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const purpose = "cashbook";
    const startDate = url.searchParams.get("startDate") || undefined;
    const endDate = url.searchParams.get("endDate") || undefined;
    const summarize = url.searchParams.get("summary") === "true";

    const dbs = getReadableDatabases(purpose);
    if (dbs.length === 0) {
      return NextResponse.json(
        { success: false, error: "No readable cashbook database configured" },
        { status: 500 }
      );
    }

    let baseQuery = `*[_type == "cashBookEntry"]`;
    const params: Record<string, unknown> = {};
    if (startDate || endDate) {
      baseQuery += ` && createdAt >= $startDate && createdAt <= $endDate`;
      params.startDate = startDate || "1970-01-01T00:00:00.000Z";
      params.endDate = endDate || "9999-12-31T23:59:59.999Z";
    }

    const entries: CashBookEntryRow[] = [];
    const dedup = new Set<string>();
    const errors: string[] = [];

    for (const db of dbs) {
      try {
        const client = getSanityClient(db.key);
        const rows = (await client.fetch<any[]>(`${baseQuery} | order(createdAt desc) ${ENTRY_PROJECTION}`, params)) || [];
        for (const row of rows) {
          if (!row || !row._id) continue;
          if (dedup.has(row._id)) continue;
          dedup.add(row._id);
          entries.push({ ...row, databaseKey: db.key });
        }
      } catch (err) {
        errors.push(`${db.key}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    entries.sort(sortByCreatedDesc);

    if (summarize || startDate || endDate) {
      const summary = entries.reduce(
        (acc, entry) => {
          if (entry.type === "credit") acc.totalCredits += Number(entry.amount) || 0;
          else if (entry.type === "debit") acc.totalDebits += Number(entry.amount) || 0;
          return acc;
        },
        { totalCredits: 0, totalDebits: 0, balance: 0 }
      );
      summary.balance = summary.totalCredits - summary.totalDebits;

      return NextResponse.json({
        success: true,
        data: entries,
        summary,
        databases: dbs.map((d) => d.key),
        ...(errors.length ? { errors } : {}),
      });
    }

    return NextResponse.json({
      success: true,
      data: entries,
      databases: dbs.map((d) => d.key),
      ...(errors.length ? { errors } : {}),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
