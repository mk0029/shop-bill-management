import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// GET: list chat rooms with proper authentication and authorization
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const adminId = searchParams.get("adminId");
    
    // Get user info from request headers (sent by client)
    const userRole = req.headers.get("x-user-role");
    const userId = req.headers.get("x-user-id");
    // Security: Enforce role-based access control
    if (userRole === "customer") {
      // Customers can ONLY access their own rooms
      if (!userId) {
        return NextResponse.json({ success: false, error: "Unauthorized: No user ID" }, { status: 401 });
      }
      
      // Ignore any customerId from query params and force it to be the authenticated user's ID
      const filter = "_type == \"chatRoom\" && customer._ref == $customerId";
      const params = { customerId: userId };
      
      const query = `*[${filter}] | order(coalesce(lastMessageAt, createdAt) desc) {
        _id,
        roomName,
        customer-> { _id, name, phone },
        lastMessage,
        lastMessageAt,
        unreadForCustomer,
        createdAt,
        updatedAt
      }`;

      const data = await sanityClient.fetch(query, params);
      return NextResponse.json({ success: true, data });
    } 
    
    if (userRole === "admin" || userRole === "super_admin") {
      // Admins can access all rooms or filter by specific criteria
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
    }

    // No valid role found - require authentication
    return NextResponse.json({ success: false, error: "Unauthorized: Authentication required" }, { status: 401 });
    
  } catch (error) {
    console.error("/api/chat/rooms GET failed:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
