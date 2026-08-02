import { NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getServerAuth } from "@/lib/server-auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getServerAuth();
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const fromParams = (params as any)?.id as string | undefined;
    const fromUrl = (() => {
      try {
        const u = new URL(req.url);
        const parts = u.pathname.split('/').filter(Boolean);
        const billsIndex = parts.lastIndexOf('bills');
        if (billsIndex >= 0 && parts[billsIndex + 1]) return parts[billsIndex + 1];
        return undefined;
      } catch {
        return undefined;
      }
    })();
    const billId = String(fromParams || fromUrl || '').trim();
    if (!billId) {
      return NextResponse.json(
        { success: false, error: "Missing bill id" },
        { status: 400 }
      );
    }

    const isCustomer = auth.role === "customer";

    const filter = isCustomer
      ? `*[_type == "billTimelineEvent" && bill._ref == $billId && isPublic == true]`
      : `*[_type == "billTimelineEvent" && bill._ref == $billId]`;

    const query = `${filter} | order(timestamp desc) [0...50] {
      _id,
      eventId,
      eventType,
      timestamp,
      actorUserId,
      actorName,
      actorRole,
      description,
      changes[]{
        field,
        label,
        oldValue,
        newValue
      },
      notes,
      isPublic,
      paymentId,
      paymentAmount,
      paymentMethod,
      cashBookEntryId
    }`;

    const events = await sanityClient.fetch(query, { billId });

    return NextResponse.json({ success: true, data: events });
  } catch (error: any) {
    console.error("[Timeline API] Failed to fetch:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}
