import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerAuth } from "@/lib/server-auth";
import { isAdminLike } from "@/lib/rbac";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const BUCKET = "profile-images";

export async function POST(request: NextRequest) {
  try {
    const admin = getAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
    }

    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, WebP images are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image exceeds 5MB limit" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    const timestamp = Date.now();
    const filePath = `${sanitizedUserId}/avatar-${timestamp}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: signedUrl } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);
    const mediaUrl = signedUrl?.signedUrl || admin.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;

    return NextResponse.json({ url: mediaUrl, path: filePath }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
