import { NextRequest, NextResponse } from 'next/server';
import { sanityClient, urlFor } from "@/lib/sanity";
import { getServerAuth } from '@/lib/server-auth';

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File must be an image (JPEG, PNG, GIF, WebP, AVIF)" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 },
      );
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(ext)) {
      return NextResponse.json({ error: "Invalid file extension" }, { status: 400 });
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const asset = await sanityClient.assets.upload("image", buffer, {
      filename: safeFileName,
      contentType: file.type,
    });

    const imageUrl = urlFor(asset).url();

    return NextResponse.json({
      success: true,
      url: imageUrl,
      assetId: asset._id,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
