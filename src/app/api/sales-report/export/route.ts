import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Sales report export is no longer available" },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Sales report export is no longer available" },
    { status: 410 }
  );
}