"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/notification-store";
import { useDataStore } from "@/store/data-store";
import { Dropdown } from "@/components/ui/dropdown";

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
  // User picker state
  const [dropdownValue, setDropdownValue] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);

  type UserOption = {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    phoneDigits?: string[];
  };

  type StoreUser = {
    _id?: string;
    id?: string;
    name?: string;
    email?: string | null;
    customerId?: string | null;
    clerkId?: string | null;
    phone?: string | null;
    phoneNumber?: string | null;
    mobile?: string | null;
    contactNumber?: string | null;
    location?: string | null;
  }

  // Derived phones from selected users
  const selectedPhones = useMemo(() => {
    const norm = (s: string) => (s || '').replace(/\D+/g, '')
    const phones: string[] = []
    for (const u of selected) {
      const digits = (u.phoneDigits && u.phoneDigits[0]) || (u.phone ? norm(u.phone) : '')
      if (digits) phones.push(digits)
    }
    return Array.from(new Set(phones))
  }, [selected])

  // Use users from global store (loaded on page load)
  const usersMap = useDataStore(s => s.users)
  const allUsers = useMemo(() => Array.from(usersMap.values() || []), [usersMap])

  // Build dropdown options
  const dropdownOptions = useMemo(() => {
    const norm = (s: string) => (s || '').replace(/\D+/g, '')
    return (allUsers || []).map((u: StoreUser) => {
      const id = String(u?._id || u?.id || '')
      const name = String(u?.name || u?.email || u?.customerId || u?.clerkId || 'Unnamed')
      const phones = [u?.phone, u?.phoneNumber, u?.mobile, u?.contactNumber].filter(Boolean)
      const phone = (phones[0] as string) || ''
      const phoneDigits = Array.from(new Set(phones.map((p: string) => norm(String(p))).filter(Boolean)))
      const location = u?.location ? String(u.location) : ''
      const label = [
        name,
        phone ? `(${phone})` : undefined,
        location ? `- ${location}` : undefined,
      ].filter(Boolean).join(' ')
      return { value: id, label, meta: { id, name, email: u?.email || null, phone: phone || null, phoneDigits } as UserOption }
    })
  }, [allUsers])

  // When selecting from dropdown, append to selected list and clear the dropdown value
  const onPickUser = useCallback((val: string) => {
    setDropdownValue(val)
    const found = dropdownOptions.find(o => o.value === val)
    if (!found) return
    const meta = found.meta as UserOption
    if (selected.some(s => s.id === meta.id)) {
      // Already selected; just clear select
      setTimeout(() => setDropdownValue(undefined), 0)
      return
    }
    setSelected(prev => [...prev, { id: meta.id, name: meta.name, email: meta.email, phone: meta.phone, phoneDigits: meta.phoneDigits }])
    // Clear control value so user can pick next
    setTimeout(() => setDropdownValue(undefined), 0)
  }, [dropdownOptions, selected])

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && (audience !== "users" || selectedPhones.length > 0);

  async function handleSend() {
    if (!canSubmit) return;
    try {
      setLoading(true);
      type AdminAudiencePayload = { title: string; body: string; data?: Record<string, string>; audience: "admins" | "all" }
      type UsersPayload = { title: string; body: string; data?: Record<string, string>; phoneNumbers: string[] }
      const base = {
        title: title.trim(),
        body: body.trim(),
        data: link.trim() ? { link: link.trim() } : undefined,
      } as const
      const payload: AdminAudiencePayload | UsersPayload =
        audience === "users"
          ? ({ ...base, phoneNumbers: selectedPhones } as UsersPayload)
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
      setDropdownValue(undefined);
      setSelected([]);
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
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Select users</label>
              <Dropdown
                options={dropdownOptions.map(o => ({ value: o.value, label: o.label }))}
                value={dropdownValue}
                onValueChange={onPickUser}
                placeholder="Choose customer"
                searchable={true}
                searchPlaceholder="Search customers..."
                className="bg-gray-800 border-gray-700"
                minW
              />
              <p className="text-xs text-gray-500">We will send notifications to the selected users’ phone numbers.</p>
            </div>
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.map(u => (
                  <span key={u.id} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md border border-gray-800 bg-gray-900 text-gray-200">
                    <span>{u.name}</span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white"
                      onClick={() => setSelected(prev => prev.filter(s => s.id !== u.id))}
                      aria-label={`Remove ${u.name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
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
