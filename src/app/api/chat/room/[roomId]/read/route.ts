import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// POST: mark a room as read by actor (admin or customer)
export async function POST(req: Request, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const { actor } = body as { actor?: 'admin' | 'customer' };

    if (!actor || !['admin', 'customer'].includes(actor)) {
      return NextResponse.json({ success: false, error: 'Invalid actor' }, { status: 400 });
    }

    // Validate room exists
    const room = await sanityClient.fetch(
      `*[_type == "chatRoom" && _id == $roomId][0]{ _id }`,
      { roomId }
    );
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    const patch = sanityClient.patch(roomId);
    if (actor === 'admin') {
      patch.set({ unreadForAdmins: 0 });
    } else {
      patch.set({ unreadForCustomer: 0 });
    }
    patch.set({ updatedAt: new Date().toISOString() });

    const updated = await patch.commit();
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('/api/chat/room/[roomId]/read POST failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
