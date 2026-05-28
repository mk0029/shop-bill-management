import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";

type ClearBody = {
  userId?: string;
  phone?: string;
  notificationId?: string;
  notificationIds?: string[];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as ClearBody;
    const userId = String(body?.userId || "").trim();
    const phone = String(body?.phone || "").trim();
    const singleId = String(body?.notificationId || "").trim();
    const multiIds = Array.isArray(body?.notificationIds)
      ? body.notificationIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
    const targetIds = Array.from(new Set([singleId, ...multiIds].filter(Boolean)));

    if (!userId && !phone) {
      return NextResponse.json(
        { error: "userId or phone is required" },
        { status: 400 },
      );
    }

    let idsToClear = targetIds;
    if (!idsToClear.length) {
      const allIds = await sanityClient.fetch<string[]>(
        `*[_type == "notification"]{_id}._id`,
      );
      idsToClear = Array.isArray(allIds) ? allIds : [];
    }

    if (!idsToClear.length) {
      return NextResponse.json({ ok: true, cleared: 0 }, { status: 200 });
    }

    const tx = sanityClient.transaction();
    for (const id of idsToClear) {
      tx.patch(id, (p: any) => {
        let patch = p.setIfMissing({
          clearedByUserIds: [],
          clearedByPhones: [],
        });
        if (userId) patch = patch.insert("after", "clearedByUserIds[-1]", [userId]);
        if (phone) patch = patch.insert("after", "clearedByPhones[-1]", [phone]);
        return patch;
      });
    }
    await tx.commit();

    return NextResponse.json({ ok: true, cleared: idsToClear.length }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

