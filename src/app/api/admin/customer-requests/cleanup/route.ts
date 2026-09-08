import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { deleteDocument } from "@/lib/sanity/write-router";
import { getServerAuth } from "@/lib/server-auth";

export const runtime = "nodejs";

const CLEANUP_AGE_MS = 72 * 60 * 60 * 1000; // 72 hours

async function cleanupDb(
  client: { fetch: <T = any>(q: string, p?: any) => Promise<T>; delete: (id: string) => Promise<any> },
  label: string,
  cutoff: string,
): Promise<{ db: string; deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;

  try {
    const docs = await client.fetch<{ _id: string }[]>(
      `*[_type == "customerRequest" && submittedAt < $cutoff]._id`,
      { cutoff },
    );

    for (const doc of docs || []) {
      try {
        await client.delete(doc._id);
        deleted++;
      } catch (e) {
        errors.push(`${doc._id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    errors.push(`query failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { db: label, deleted, errors };
}

export async function POST() {
  return handle();
}

export async function GET() {
  return handle();
}

async function handle() {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (auth.role !== "admin" && auth.role !== "super_admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const cutoff = new Date(Date.now() - CLEANUP_AGE_MS).toISOString();

    const opsClient = getSanityClient("operations");

    const [primary, ops, customers] = await Promise.all([
      cleanupDb(sanityClient, "primary", cutoff),
      cleanupDb(opsClient, "operations", cutoff),
      cleanupDb(getSanityClient("customers"), "customers", cutoff),
    ]);

    const totalDeleted = primary.deleted + ops.deleted + customers.deleted;
    const allErrors = [...primary.errors, ...ops.errors, ...customers.errors];

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      details: { primary, ops, customers },
      ...(allErrors.length ? { errors: allErrors } : {}),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
