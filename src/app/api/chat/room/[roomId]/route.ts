import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import type { NextRequest } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    
    // Get room ID from params
    const { roomId } = params;
    if (!roomId) {
      return NextResponse.json(
        { success: false, error: "Room ID is required" },
        { status: 400 }
      );
    }

    try {
      
      // First, verify the room exists
      const room = await sanityClient.getDocument(roomId).catch(() => null);
      if (!room) {
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
      
      
      // Delete each message
      if (messages.length > 0) {
        const deletePromises = messages.map((message: { _id: string }) => {
          return sanityClient.delete(message._id);
        });
        
        await Promise.all(deletePromises);
        console.log('All messages deleted');
      } else {
        console.log('No messages to delete');
      }

      // Then delete the room
      await sanityClient.delete(roomId);
      
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
