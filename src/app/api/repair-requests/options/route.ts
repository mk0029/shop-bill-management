import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type TechnicianOption = {
  _id: string;
  name?: string;
  role?: string;
  phone?: string;
};

export async function GET() {
  const auth = await getServerAuth();
  if (!auth.isAuthenticated) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const technicians = await sanityClient.fetch<TechnicianOption[]>(
    `*[_type=="user" && role in ["technician","admin","super_admin"] && isActive != false]{
      _id, name, role, phone
    } | order(role asc, name asc)`,
  );

  return NextResponse.json({ success: true, technicians: technicians || [] });
}
