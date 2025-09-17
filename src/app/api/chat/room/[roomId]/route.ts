import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import type { NextRequest } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    console.log('DELETE /api/chat/room/[roomId] called with params:', params);
    
    // Get room ID from params
    const { roomId } = params;
    if (!roomId) {
      console.log('Bad Request: No room ID provided');
      return NextResponse.json(
        { success: false, error: "Room ID is required" },
        { status: 400 }
      );
    }

    try {
      console.log('Fetching messages for room:', roomId);
      
      // First, verify the room exists
      const room = await sanityClient.getDocument(roomId).catch(() => null);
      if (!room) {
        console.log('Room not found:', roomId);
        return NextResponse.json(
          { success: false, error: "Room not found" },
          { status: 404 }
        );
      }

      // Delete all messages in the room first
      const messages = await sanityClient.fetch(
        `*[_type == 'chatMessage' && references($roomId)]`,
        { roomId }
      );
      
      console.log(`Found ${messages.length} messages to delete`);
      
      // Delete each message
      if (messages.length > 0) {
        const deletePromises = messages.map((message: { _id: string }) => {
          console.log('Deleting message:', message._id);
          return sanityClient.delete(message._id);
        });
        
        await Promise.all(deletePromises);
        console.log('All messages deleted');
      } else {
        console.log('No messages to delete');
      }

      // Then delete the room
      console.log('Deleting room:', roomId);
      await sanityClient.delete(roomId);
      console.log('Room deleted successfully');
      
    } catch (error) {
      console.error("Error during room deletion:", error);
      return NextResponse.json(
        { success: false, error: "Failed to delete room" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat room:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete chat room" },
      { status: 500 }
    );
  }
}
