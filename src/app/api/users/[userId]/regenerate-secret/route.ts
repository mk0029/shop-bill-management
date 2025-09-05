import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  try {
    // Generate a new secret key
    const secretKey = Buffer.from(
      Date.now().toString() + Math.random().toString()
    )
      .toString("base64")
      .substring(0, 16);

    const updated = await sanityClient
      .patch(userId)
      .set({ secretKey, updatedAt: new Date().toISOString() })
      .commit();

    return NextResponse.json({ success: true, data: { secretKey, user: updated } });
  } catch (error) {
    console.error("Failed to regenerate secret key:", error);
    return NextResponse.json(
      { success: false, error: "Failed to regenerate secret key" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
