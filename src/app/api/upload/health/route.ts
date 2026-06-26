import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function GET() {
  const checks: Record<string, any> = {
    env_vars: { url: !!supabaseUrl, key: !!supabaseServiceKey },
  };

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ connected: false, checks, error: "Missing env vars" }, { status: 200 });
  }

  try {
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: buckets, error } = await admin.storage.listBuckets();
    if (error) {
      checks.storage = { error: error.message };
      return NextResponse.json({ connected: false, checks }, { status: 200 });
    }

    const bucketNames = buckets?.map((b) => b.id) || [];
    checks.storage = {
      buckets: bucketNames,
      chat_media: bucketNames.includes("chat-media"),
      profile_images: bucketNames.includes("profile-images"),
    };

    return NextResponse.json({ connected: true, checks }, { status: 200 });
  } catch (err) {
    checks.connection = { error: err instanceof Error ? err.message : "Unknown error" };
    return NextResponse.json({ connected: false, checks }, { status: 200 });
  }
}
