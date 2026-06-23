"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  defaultShopStatusMessages,
  type ShopStatusKey,
  type ShopStatusMessages,
} from "@/lib/shop-status-message-defaults";

const rows: Array<{ key: ShopStatusKey; label: string; helper: string }> = [
  {
    key: "offline",
    label: "Offline",
    helper: "Sent when the shop becomes unavailable.",
  },
  {
    key: "online",
    label: "Available",
    helper: "Sent when the shop is available online.",
  },
  {
    key: "at_shop",
    label: "At Shop",
    helper: "Sent when customers can visit the shop.",
  },
];

export default function ShopStatusMessagesSettings() {
  const [messages, setMessages] = useState<ShopStatusMessages>(
    defaultShopStatusMessages,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/shop-status-messages", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok || !json?.success)
          throw new Error(json?.error || "Failed to load messages");
        setMessages(json.data);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load messages",
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const updateField = (
    key: ShopStatusKey,
    field: "title" | "body",
    value: string,
  ) => {
    setMessages((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }));
  };

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/shop-status-messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success)
        throw new Error(json?.error || "Failed to save messages");
      setMessages(json.data);
      toast.success("Shop status messages saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save messages",
      );
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setMessages(defaultShopStatusMessages);
  };

  return (
    <div className="h-[var(--app-vh,100dvh)] bg-gray-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              Shop Status Messages
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              These messages are sent to users when the shop status changes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetDefaults}
              disabled={loading || saving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Defaults
            </Button>
            <Button onClick={save} disabled={loading || saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {rows.map((row) => (
            <section
              key={row.key}
              className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
            >
              <div className="mb-3">
                <h2 className="text-base font-semibold">{row.label}</h2>
                <p className="text-xs text-slate-400">{row.helper}</p>
              </div>
              <div className="grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-slate-300">
                    Notification title
                  </span>
                  <input
                    value={messages[row.key].title}
                    onChange={(event) =>
                      updateField(row.key, "title", event.target.value)
                    }
                    className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    maxLength={80}
                    disabled={loading || saving}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-slate-300">
                    Notification message
                  </span>
                  <textarea
                    value={messages[row.key].body}
                    onChange={(event) =>
                      updateField(row.key, "body", event.target.value)
                    }
                    className="min-h-24 resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500"
                    maxLength={220}
                    disabled={loading || saving}
                  />
                </label>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
