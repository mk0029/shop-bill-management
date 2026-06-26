import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/webm", "audio/ogg", "audio/wav", "audio/mp4",
  "application/pdf", "application/zip", "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const BUCKET = "chat-media";

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const roomId = formData.get("roomId") as string | null;
    const messageId = formData.get("messageId") as string | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !roomId || !messageId) {
      return NextResponse.json({ error: "Missing file, roomId, or messageId" }, { status: 400 });
    }

    const baseType = file.type.split(";")[0].trim();
    if (!ALLOWED_TYPES.includes(baseType) && !baseType.startsWith("image/")) {
      return NextResponse.json({ error: `File type ${file.type} not supported` }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 25MB limit" }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${roomId}/${messageId}/${timestamp}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: signedUrl } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10); // 10 years
    const mediaUrl = signedUrl?.signedUrl || admin.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;

    let imgWidth: number | undefined;
    let imgHeight: number | undefined;
    if (file.type.startsWith("image/")) {
      try {
        const imgMeta = await sharp(buffer).metadata();
        imgWidth = imgMeta.width;
        imgHeight = imgMeta.height;
      } catch {}
    }

    const metadata = {
      type: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "file",
      url: mediaUrl,
      path: filePath,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      width: imgWidth,
      height: imgHeight,
      uploadedAt: new Date().toISOString(),
    };

    // Track upload in database
    await admin.from("uploads").insert({
      file_path: filePath,
      bucket: BUCKET,
      room_id: roomId,
      message_id: messageId,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: userId || "unknown",
    }).maybeSingle();

    return NextResponse.json({ url: mediaUrl, path: filePath, metadata }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
