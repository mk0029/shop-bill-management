import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// GET: list chat rooms, optionally filter by customerId or adminId in query params
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const adminId = searchParams.get("adminId");

    let filter = "_type == \"chatRoom\"";
    const params: Record<string, unknown> = {};

    if (customerId) {
      filter += " && customer._ref == $customerId";
      params.customerId = customerId;
    }

    if (adminId) {
      filter += " && $adminId in admins[]._ref";
      params.adminId = adminId;
    }

    const where = filter === "_type == \"chatRoom\"" ? filter : `(${filter})`;
    const query = `*[${where}] | order(coalesce(lastMessageAt, createdAt) desc) {
      _id,
      roomName,
      customer-> { _id, name, phone },
      admins[]-> { _id, name },
      lastMessage,
      lastMessageAt,
      unreadForCustomer,
      unreadForAdmins,
      createdAt,
      updatedAt
    }`;

    const data = await sanityClient.fetch(query, params);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("/api/chat/rooms GET failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
