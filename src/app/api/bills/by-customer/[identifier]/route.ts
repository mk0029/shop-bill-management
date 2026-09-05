import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { fetchBills } from "@/lib/sanity/bills-federated";
import { getServerAuth } from "@/lib/server-auth";
import { sanitizeBillForCustomer } from "@/lib/customer-data-sanitizer";

// Use previewDrafts on the server to include drafts if any
const serverClient = sanityClient.withConfig({ perspective: "previewDrafts" });

function isStaff(role: string | null) {
  return role === "admin" || role === "super_admin" || role === "technician";
}

export async function GET(
  req: Request,
  { params }: { params: { identifier: string } }
) {
  const { identifier } = params;
  const url = new URL(req.url);
  const by = (url.searchParams.get("by") || "_id") as "_id" | "customerId" | "secretKey";

  const auth = await getServerAuth();
  if (!auth.isAuthenticated) {
    return NextResponse.json({ bills: [], error: "Unauthorized" }, { status: 401 });
  }

  try {
    const candidates: string[] = [];
    const esc = (v: unknown) => String(v ?? "").replace(/"/g, '\\"');
    // Resolved user doc (when the identifier resolves to a user) for the auth check
    let resolvedUser: { _id?: string; customerId?: string } | null = null;

    // Helper to push unique values
    const push = (v?: string) => {
      if (!v) return;
      if (!candidates.includes(v)) candidates.push(v);
    };

    // If secretKey: resolve both _id and customerId
    if (by === "secretKey") {
      const userQuery = `*[_type == "user" && secretKey == "${esc(identifier)}"][0]{ _id, customerId }`;
      const user = await serverClient.fetch(userQuery);
      if (!user) {
        return NextResponse.json({ bills: [] });
      }
      resolvedUser = user;
      push(user._id);
      push(user.customerId);
    }

    // If by customerId: try the exact id and base64-decoded variant; also resolve the user _id
    if (by === "customerId") {
      push(identifier);
      // Attempt base64 decode of identifier (if applicable)
      try {
        const decoded = Buffer.from(identifier, "base64").toString("utf8");
        if (decoded && decoded !== identifier) push(decoded);
      } catch {}
      // Resolve user by either original or decoded customerId to get _id
      const cidAlt = candidates.find((c) => c !== identifier) || "";
      const userQuery = `*[_type == "user" && (customerId == "${esc(identifier)}" || customerId == "${esc(cidAlt)}")][0]{ _id, customerId }`;
      const user = await serverClient.fetch(userQuery);
      if (user) {
        resolvedUser = user;
        push(user._id);
        push(user.customerId);
      }
    }

    // If by _id: try the id directly and resolve the user's customerId
    if (by === "_id") {
      push(identifier);
      const userQuery = `*[_type == "user" && (_id == "${esc(identifier)}" || id == "${esc(identifier)}")][0]{ _id, customerId }`;
      const user = await serverClient.fetch(userQuery);
      if (user) {
        resolvedUser = user;
        push(user.customerId);
        push(user._id);
      }
    }

    // Fallback: if no candidate resolved, still try with provided identifier
    if (candidates.length === 0) {
      candidates.push(identifier);
    }

    // Customers may only read their OWN bills. Reject if the identifier cannot
    // be tied to the authenticated customer. (Staff may query anyone.)
    if (!isStaff(auth.role)) {
      const own = new Set(
        [auth.userId, auth.customerId].filter(Boolean).map((v) => String(v)),
      );
      const identifierOwn = own.has(String(identifier));
      const userOwn =
        own.has(String(resolvedUser?._id ?? "")) ||
        own.has(String(resolvedUser?.customerId ?? ""));
      if (!identifierOwn && !userOwn) {
        return NextResponse.json({ bills: [], error: "Forbidden" }, { status: 403 });
      }
    }

    // Try all candidates in a single federated query
    try {
      const bills = await fetchBills({ customerIds: Array.from(new Set(candidates)) });
      const safeBills = isStaff(auth.role)
        ? bills
        : Array.isArray(bills)
          ? bills.map((b) => sanitizeBillForCustomer(b))
          : [];
      return NextResponse.json({ bills: Array.isArray(bills) ? safeBills : [] });
    } catch (e) {
      // fall through to empty result
    }

    // Nothing found
    return NextResponse.json({ bills: [], meta: { candidates } });
  } catch (error: any) {
    console.error("Error fetching bills by customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills", details: String(error?.message || error), meta: { identifier, by, note: "See server logs for stack" } },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
