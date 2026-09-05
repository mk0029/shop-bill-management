import { NextRequest } from "next/server";
import { getSanityClient } from "@/lib/sanity/client-factory";
import { getReadableDatabases } from "@/lib/sanity/database-registry";
import {
  CASHBOOK_ENTRY_PROJECTION,
  type CashBookEntryRow,
} from "@/lib/cashbook-entry-projection";
import type { Subscription } from "rxjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;
const LISTEN_QUERY = '*[_type == "cashBookEntry"]';

export async function GET(req: NextRequest) {
  const dbs = getReadableDatabases("cashbook");
  if (dbs.length === 0) {
    return new Response("No cashbook database configured", { status: 500 });
  }

  const encoder = new TextEncoder();
  let subs: Subscription[] = [];

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // client disconnected
        }
      };

      const forward = async (type: "added" | "updated" | "deleted", entryId: string) => {
        try {
          if (type === "deleted") {
            send(type, { _id: entryId });
            return;
          }
          for (const db of dbs) {
            try {
              const client = getSanityClient(db.key);
              const rows = await client.fetch<CashBookEntryRow[]>(
                `*[_id in [$id]] ${CASHBOOK_ENTRY_PROJECTION}`,
                { id: entryId }
              );
              const row = rows?.[0];
              if (row) {
                send(type, { ...row, databaseKey: db.key });
                return;
              }
            } catch {
              // try next readable cashbook db
            }
          }
        } catch {
          // never throw out of the listener
        }
      };

      subs = dbs.map((db) => {
        try {
          const client = getSanityClient(db.key);
          return client
            .listen(
              LISTEN_QUERY,
              {},
              { includeResult: true, includePreviousRevision: false, visibility: "query" }
            )
            .subscribe({
              next: (update: any) => {
                const docId: string | undefined = update?.documentId;
                const result = update?.result;
                const transition = update?.transition;
                if (!docId) return;
                if (transition === "appear" || transition === "update") {
                  if (result) void forward("updated", docId);
                } else if (transition === "disappear") {
                  void forward("deleted", docId);
                }
              },
              error: () => {},
              complete: () => {},
            });
        } catch {
          return null as unknown as Subscription;
        }
      });
      subs = subs.filter((s) => !!s);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);

      const disconnect = () => clearInterval(heartbeat);
      const close = () => disconnect();
      if (typeof (req.signal as any)?.addEventListener === "function") {
        (req.signal as AbortSignal).addEventListener("abort", close, { once: true });
      }
    },
    cancel() {
      for (const s of subs) s?.unsubscribe();
      subs = [];
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}