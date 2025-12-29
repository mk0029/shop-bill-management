import { NextResponse } from "next/server";
import { sanityClient, queries } from "@/lib/sanity";

// Use previewDrafts on the server to include drafts if any
const serverClient = sanityClient.withConfig({ perspective: "previewDrafts" });

export async function GET(
  req: Request,
  { params }: { params: { identifier: string } }
) {
  const { identifier } = params;
  const url = new URL(req.url);
  const by = (url.searchParams.get("by") || "_id") as "_id" | "customerId" | "secretKey";

  try {
    const candidates: string[] = [];
    const esc = (v: unknown) => String(v ?? "").replace(/"/g, '\\"');

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
        push(user.customerId);
        push(user._id);
      }
    }

    // Fallback: if no candidate resolved, still try with provided identifier
    if (candidates.length === 0) {
      candidates.push(identifier);
    }

    // Try candidates until we get data
    for (const id of candidates) {
      try {
        const query = queries.customerBills(id);
        const bills = await serverClient.fetch(query);
        if (Array.isArray(bills) && bills.length > 0) {
          return NextResponse.json({ bills });
        }
      } catch (e) {
        // continue trying other candidates
      }
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
