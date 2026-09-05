import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { getSanityClient } from "@/lib/sanity/client-factory";

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

    const dps = [sanityClient, getSanityClient("comms")];
    const dbExisting: string[][] = await Promise.all(
      dps.map((client) =>
        client
          .fetch<string[]>(`*[_type == "notification"]{_id}._id`)
          .then((ids) => (Array.isArray(ids) ? ids : []))
          .catch(() => []),
      ),
    );

    let idsToClear = targetIds;
    if (!idsToClear.length) {
      idsToClear = Array.from(new Set(dbExisting.flat()));
    }

    if (!idsToClear.length) {
      return NextResponse.json({ ok: true, cleared: 0 }, { status: 200 });
    }

    const validIds = idsToClear.filter((id) => !id.includes(":") && !id.includes(".."));
    const validSet = new Set(validIds);
    let cleared = 0;

    for (let i = 0; i < dps.length; i++) {
      const present = dbExisting[i].filter((id) => validSet.has(id));
      if (!present.length) continue;
      const tx = dps[i].transaction();
      for (const id of present) {
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
      cleared += present.length;
    }

    return NextResponse.json({ ok: true, cleared, skipped: validIds.length - cleared }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

