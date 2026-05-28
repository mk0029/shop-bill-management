import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// GET: get or create a chat room for a given customerId
export async function GET(_req: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  try {
    // Fetch customer document
    const customer = await sanityClient.fetch(
      `*[_type == "user" && _id == $customerId][0]{ _id, name, role }`,
      { customerId }
    );
    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    // Try find existing room by customer reference
    const existingRoom = await sanityClient.fetch(
      `*[_type == "chatRoom" && customer._ref == $customerId][0]{
        _id, roomName, customer->{_id, name}, admins[]->{_id, name},
        participants[]{
          role, muted, blocked, notify, lastReadAt, isActive, user->{_id, name}
        },
        lastMessage, lastMessageAt, unreadForCustomer, unreadForAdmins, createdAt, updatedAt
      }`,
      { customerId }
    );

    if (existingRoom) {
      return NextResponse.json({ success: true, data: existingRoom });
    }

    // Get all admin users so they can be pre-added to admins[]
    const adminIds: string[] = await sanityClient.fetch(
      `*[_type == "user" && role in ["admin", "super_admin", "technician"]]._id`
    );

    const now = new Date().toISOString();
    const roomName = `admin-(${customer.name ?? "customer"})`;

    // Create new room
    const roomDoc = await sanityClient.create({
      _type: "chatRoom",
      roomName,
      customer: { _type: "reference", _ref: customerId },
      admins: adminIds.map((_id) => ({ _type: "reference", _ref: _id })),
      participants: [
        { _type: 'object', role: 'customer', user: { _type: 'reference', _ref: customerId }, muted: false, blocked: false, notify: true, isActive: true },
        ...adminIds.map((_id) => ({ _type: 'object', role: 'admin', user: { _type: 'reference', _ref: _id }, muted: false, blocked: false, notify: true, isActive: true }))
      ],
      lastMessage: "",
      lastMessageAt: now,
      unreadForCustomer: 0,
      unreadForAdmins: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Return hydrated
    const hydrated = await sanityClient.fetch(
      `*[_type == "chatRoom" && _id == $id][0]{
        _id, roomName, customer->{_id, name}, admins[]->{_id, name},
        participants[]{ role, muted, blocked, notify, lastReadAt, isActive, user->{_id, name} },
        lastMessage, lastMessageAt, unreadForCustomer, unreadForAdmins, createdAt, updatedAt
      }`,
      { id: (roomDoc as { _id: string })._id }
    );

    return NextResponse.json({ success: true, data: hydrated });
  } catch (error) {
    console.error("/api/chat/room/by-customer/[customerId] GET failed:", error);
    return NextResponse.json({ success: false, error: "Failed to get/create room" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
