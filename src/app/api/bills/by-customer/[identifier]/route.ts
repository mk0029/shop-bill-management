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
    let candidates: string[] = [];

    if (by === "secretKey") {
      const userQuery = `*[_type == "user" && secretKey == $secretKey][0]{ _id, customerId }`;
      const user = await serverClient.fetch(userQuery, { secretKey: identifier });
      if (!user) {
        return NextResponse.json({ bills: [] });
      }
      candidates = [user._id, user.customerId].filter(Boolean);
    } else if (by === "customerId") {
      candidates = [identifier];
    } else {
      // default _id
      candidates = [identifier];
    }

    // Try candidates until we get data
    for (const id of candidates) {
      const query = queries.customerBills(id);
      const bills = await serverClient.fetch(query);
      if (Array.isArray(bills) && bills.length > 0) {
        return NextResponse.json({ bills });
      }
    }

    // Nothing found
    return NextResponse.json({ bills: [] });
  } catch (error) {
    console.error("Error fetching bills by customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
