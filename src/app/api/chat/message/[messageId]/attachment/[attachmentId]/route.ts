import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

// DELETE: remove a specific attachment from a message
export async function DELETE(
  req: Request,
  context: { params: Promise<{ messageId: string; attachmentId: string }> }
) {
  let messageId: string;
  let attachmentId: string;
  
  try {
    // Await params (Next.js 15 requirement)
    const resolvedParams = await context.params;
    messageId = resolvedParams.messageId;
    attachmentId = resolvedParams.attachmentId;
    
    console.log("=== DELETE ATTACHMENT REQUEST ===");
    console.log("messageId:", messageId);
    console.log("attachmentId:", attachmentId);
    
    // Verify Sanity token is configured
    const sanityToken = process.env.SANITY_API_TOKEN 
    
    if (!sanityToken) {
      console.log("ERROR: No Sanity API token configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error - No Sanity token" },
        { status: 500 }
      );
    }
    
    console.log("Sanity token configured:", !!sanityToken);
    
    // Optional: Check for authorization header
    // Note: This is a server-side route, and the admin page is already protected by Clerk
    const authHeader = req.headers.get('Authorization');
    console.log("Authorization header present:", !!authHeader);
    
    // For now, we'll allow the request if it comes from the server
    // In production, you might want to add additional security checks
    // such as verifying the token or checking IP restrictions

    // Fetch the current message to get its attachments
    const message = await sanityClient.fetch(
      `*[_type == "chatMessage" && _id == $messageId][0]{
        _id,
        attachments
      }`,
      { messageId }
    );

    console.log("Fetched message:", JSON.stringify(message, null, 2));

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message not found" },
        { status: 404 }
      );
    }

    // Check if message has attachments
    if (!message.attachments || message.attachments.length === 0) {
      return NextResponse.json(
        { success: false, error: "No attachments found" },
        { status: 404 }
      );
    }

    console.log("Current attachments:", JSON.stringify(message.attachments, null, 2));

    // Filter out the attachment to delete
    // Match by _id, url, or filename since _id might not always be set
    interface MessageAttachment {
      _id?: string;
      filename: string;
      size: number;
      type: string;
      url: string;
    }
    
    const updatedAttachments = message.attachments.filter(
      (att: MessageAttachment) => {
        const matches = att._id === attachmentId || 
                       att.url?.includes(attachmentId) ||
                       att.filename === attachmentId;
        console.log(`Checking attachment ${att._id || att.filename}: matches=${matches}`);
        return !matches;
      }
    );

    console.log("Updated attachments:", JSON.stringify(updatedAttachments, null, 2));

    // Check if attachment was found
    if (updatedAttachments.length === message.attachments.length) {
      return NextResponse.json(
        { success: false, error: `Attachment not found. Tried to match: ${attachmentId}` },
        { status: 404 }
      );
    }

    // Update the message with the filtered attachments
    const updatedMessage = await sanityClient
      .patch(messageId)
      .set({ 
        attachments: updatedAttachments.length > 0 ? updatedAttachments : [],
        updatedAt: new Date().toISOString()
      })
      .commit();

    console.log("Successfully deleted attachment");

    return NextResponse.json({ 
      success: true, 
      data: updatedMessage,
      message: "Attachment deleted successfully"
    });
  } catch (error) {
    console.error("Failed to delete attachment - Full error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete attachment" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
