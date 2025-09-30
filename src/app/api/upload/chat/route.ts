import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from "@/lib/sanity";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB for chat attachments)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Validate file type (allow images, audio, PDFs, documents, and common file types)
    const allowedTypes = [
      'image/',
      'audio/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const isAllowedType = allowedTypes.some(type => file.type.startsWith(type));
    if (!isAllowedType) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed types: images, audio, PDF, Word, Excel, text files" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Sanity with appropriate asset type
    // Sanity supports 'image' and 'file' types. Audio files should use 'file'.
    const assetType = file.type.startsWith('image/') ? 'image' : 'file';
    
    // Normalize audio MIME types for better Sanity compatibility
    let contentType = file.type;
    if (file.type.startsWith('audio/')) {
      // Sanity sometimes has issues with specific audio codecs in MIME type
      // Normalize to basic audio types
      if (file.type.includes('webm')) {
        contentType = 'audio/webm';
      } else if (file.type.includes('ogg')) {
        contentType = 'audio/ogg';
      } else if (file.type.includes('mp3') || file.type.includes('mpeg')) {
        contentType = 'audio/mpeg';
      } else if (file.type.includes('wav')) {
        contentType = 'audio/wav';
      }
    }
    
    const asset = await sanityClient.assets.upload(
      assetType,
      buffer,
      {
        filename: file.name,
        contentType: contentType,
      }
    );

    return NextResponse.json({
      success: true,
      url: asset.url,
      assetId: asset._id,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    // Log detailed error for debugging
    if (error instanceof Error) {
      console.error("Error details:", error.message, error.stack);
    }
    return NextResponse.json(
      { 
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
