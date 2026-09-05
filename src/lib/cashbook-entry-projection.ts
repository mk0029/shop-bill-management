import type { SanityClient } from "@sanity/client";

export const CASHBOOK_ENTRY_PROJECTION = `{
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

export interface CashBookEntryRow {
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
  category?: string;
  notes?: string;
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

export async function fetchCashBookEntries(
  client: SanityClient,
  queryParams?: { startDate?: string; endDate?: string }
): Promise<CashBookEntryRow[]> {
  let baseQuery = `*[_type == "cashBookEntry"]`;
  const params: Record<string, unknown> = {};
  if (queryParams?.startDate || queryParams?.endDate) {
    baseQuery += ` && createdAt >= $startDate && createdAt <= $endDate`;
    params.startDate = queryParams?.startDate || "1970-01-01T00:00:00.000Z";
    params.endDate = queryParams?.endDate || "9999-12-31T23:59:59.999Z";
  }
  const rows = (await client.fetch<any[]>(
    `${baseQuery} | order(createdAt desc) ${CASHBOOK_ENTRY_PROJECTION}`,
    params
  )) || [];
  return rows.filter((r) => r && r._id);
}