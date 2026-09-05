import { NextRequest, NextResponse } from "next/server";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { getReadableDatabases } from "@/lib/sanity/database-registry";
import {
  fetchCashBookEntries,
  type CashBookEntryRow,
} from "@/lib/cashbook-entry-projection";

export const runtime = "nodejs";

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

    const entries: CashBookEntryRow[] = [];
    const dedup = new Set<string>();
    const errors: string[] = [];

    for (const db of dbs) {
      try {
        const client = getSanityClient(db.key);
        const rows = await fetchCashBookEntries(client, { startDate, endDate });
        for (const row of rows) {
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
