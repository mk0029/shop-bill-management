import { NextResponse } from "next/server";
import { fetchBills } from "@/lib/sanity/bills-federated";
import { getServerAuth } from "@/lib/server-auth";
import { sanitizeBillForCustomer } from "@/lib/customer-data-sanitizer";

function isStaff(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

export async function GET(req: Request) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    let customerInfo: { customerId?: string; customerIds?: string[] } = {};

    // Customers can only ever query their OWN bills. Bills are stored keyed by
    // the Sanity user `_id` (legacy `customer._ref` or billing-DB plain
    // `customer`/`customerId`), so pass both the `_id` and the shop customer
    // code — a code alone matches nothing. Forcing the scope from the auth
    // cookie also prevents IDOR via a crafted customerId param.
    if (!isStaff(auth.role)) {
      customerInfo = {
        customerIds: [auth.userId, auth.customerId]
          .filter(Boolean)
          .map((v) => String(v)),
      };
    } else {
      customerInfo = {
        customerId: url.searchParams.get("customerId") || undefined,
      };
    }

    let bills = await fetchBills(customerInfo);

    if (!isStaff(auth.role)) {
      const own = new Set(
        [auth.userId, auth.customerId].filter(Boolean).map((v) => String(v)),
      );
      // Extra defense: drop any bill that doesn't clearly belong to this customer
      bills = bills.filter((b) => {
        const custId = String(b?.customer?._id ?? b?.customerId ?? "");
        const custCid = String(b?.customer?.customerId ?? "");
        return own.has(custId) || own.has(custCid);
      });
      bills = bills.map((b) => sanitizeBillForCustomer(b));
    }

    return NextResponse.json({ success: true, data: bills });
  } catch (error) {
    console.error("/api/bills/federated failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";