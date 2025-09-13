"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/notification-store";

export type Audience = "admins" | "all" | "users";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function NotificationBroadcastModal({ open, onClose }: Props) {
  const addLocal = useNotificationStore((s) => s.add)
  const [audience, setAudience] = useState<Audience>("admins");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [userIdsRaw, setUserIdsRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);

  const userIds = useMemo(
    () => userIdsRaw.split(",").map(s => s.trim()).filter(Boolean),
    [userIdsRaw]
  );

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && (audience !== "users" || userIds.length > 0);

  async function handleSend() {
    if (!canSubmit) return;
    try {
      setLoading(true);
      type AdminAudiencePayload = { title: string; body: string; data?: Record<string, string>; audience: "admins" | "all" }
      type UsersPayload = { title: string; body: string; data?: Record<string, string>; userIds: string[] }
      const base = {
        title: title.trim(),
        body: body.trim(),
        data: link.trim() ? { link: link.trim() } : undefined,
      } as const
      const payload: AdminAudiencePayload | UsersPayload =
        audience === "users"
          ? ({ ...base, userIds } as UsersPayload)
          : ({ ...base, audience } as AdminAudiencePayload)

      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = json?.error || (Array.isArray(json?.errors) ? json.errors[0] : "Failed to send");
        throw new Error(err);
      }
      const sent = typeof json?.sent === 'number' ? json.sent : undefined
      const failed = typeof json?.failed === 'number' ? json.failed : undefined
      const partial = typeof failed === 'number' && failed > 0
      toast.success(partial ? `Sent ${sent}, failed ${failed}` : `Sent ${sent} notifications`)
      // Save locally only if there is NO active Service Worker (to avoid duplicates).
      try {
        const hasSW = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        let active = false
        if (hasSW) {
          try {
            const reg = await navigator.serviceWorker.getRegistration()
            active = !!(reg?.active || navigator.serviceWorker.controller)
          } catch {
            active = !!navigator.serviceWorker?.controller
          }
        }
        if (!active) {
          addLocal({
            type: 'system',
            title: title.trim(),
            body: body.trim(),
            meta: {
              source: 'broadcast',
              route: link.trim() ? { pathname: link.trim() } : undefined,
            },
          })
        }
      } catch {}
      onClose();
      // Reset
      setTitle("");
      setBody("");
      setLink("");
      setUserIdsRaw("");
      setAudience("admins");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to send notification"
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Autofocus title when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard shortcut: Ctrl/Cmd + Enter to send
  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSubmit && !loading) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Send custom notification" size="lg">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-400">Compose a message and choose who should receive it.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["admins", "all", "users"] as Audience[]).map(key => (
            <Button
              key={key}
              type="button"
              variant={audience === key ? "default" : "outline"}
              onClick={() => setAudience(key)}
              className={cn("capitalize", audience === key ? "" : "bg-transparent")}
            >
              {key === "users" ? "Specific users" : key}
            </Button>
          ))}
        </div>

        {audience === "users" && (
          <div className="space-y-2">
            <label className="text-sm text-gray-300">User IDs (comma separated)</label>
            <Input
              placeholder="uid-1, uid-2, ..."
              value={userIdsRaw}
              onChange={e => setUserIdsRaw(e.target.value)}
            />
            <p className="text-xs text-gray-500">Accepts Sanity _id, Clerk userId or customerId as configured.</p>
          </div>
        )}

        

        <div className="space-y-2">
          <label className="text-sm text-gray-300">Title</label>
          <Input ref={titleRef} placeholder="e.g. System update" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={onKeyDown} />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-300">Message</label>
          <Textarea rows={4} placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} onKeyDown={onKeyDown} />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-300">Deep link (optional)</label>
          <Input placeholder="/admin/billing or /customer/bills/123" value={link} onChange={e => setLink(e.target.value)} onKeyDown={onKeyDown} />
          <p className="text-xs text-gray-500">The service worker will navigate to this path when users click the notification.</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSend} disabled={!canSubmit || loading}>{loading ? "Sending..." : "Send"}</Button>
        </div>
      </div>
    </Modal>
  );
}
