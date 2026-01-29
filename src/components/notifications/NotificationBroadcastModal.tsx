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
import { useAuthStore } from "@/store/auth-store";

export type Audience = "admins" | "all" | "users" | "whatsapp";

type Props = {
  open: boolean;
  onClose: () => void;
  initialAudience?: Audience;
};

export default function NotificationBroadcastModal({
  open,
  onClose,
  initialAudience,
}: Props) {
  const addLocal = useNotificationStore((s) => s.add);
  const { user: authUser } = useAuthStore();
  const actorUserId = (authUser as any)?.id || (authUser as any)?._id || "";
  const [audience, setAudience] = useState<Audience>("admins");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [alsoNotifyAdmins, setAlsoNotifyAdmins] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  // User picker state
  const [dropdownValue, setDropdownValue] = useState<string | undefined>(
    undefined,
  );
  const [selected, setSelected] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!initialAudience) return;
    setAudience(initialAudience);
  }, [open, initialAudience]);

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
  };

  // Derived phones from selected users
  const selectedPhones = useMemo(() => {
    const norm = (s: string) => (s || "").replace(/\D+/g, "");
    const phones: string[] = [];
    for (const u of selected) {
      const digits =
        (u.phoneDigits && u.phoneDigits[0]) || (u.phone ? norm(u.phone) : "");
      if (digits) phones.push(digits);
    }
    return Array.from(new Set(phones));
  }, [selected]);

  const selectedUserIds = useMemo(() => {
    return Array.from(
      new Set((selected || []).map((u) => String(u.id || "")).filter(Boolean)),
    );
  }, [selected]);

  // Use users from global store (loaded on page load)
  const usersMap = useDataStore((s) => s.users);
  const allUsers = useMemo(
    () => Array.from(usersMap.values() || []),
    [usersMap],
  );

  // Build dropdown options
  const dropdownOptions = useMemo(() => {
    const norm = (s: string) => (s || "").replace(/\D+/g, "");
    return (allUsers || []).map((u: StoreUser) => {
      const id = String(u?._id || u?.id || "");
      const name = String(
        u?.name || u?.email || u?.customerId || u?.clerkId || "Unnamed",
      );
      const phones = [
        u?.phone,
        u?.phoneNumber,
        u?.mobile,
        u?.contactNumber,
      ].filter(Boolean);
      const phone = (phones[0] as string) || "";
      const phoneDigits = Array.from(
        new Set(phones.map((p: string) => norm(String(p))).filter(Boolean)),
      );
      const location = u?.location ? String(u.location) : "";
      const label = [
        name,
        phone ? `(${phone})` : undefined,
        location ? `- ${location}` : undefined,
      ]
        .filter(Boolean)
        .join(" ");
      return {
        value: id,
        label,
        meta: {
          id,
          name,
          email: u?.email || null,
          phone: phone || null,
          phoneDigits,
        } as UserOption,
      };
    });
  }, [allUsers]);

  // When selecting from dropdown, append to selected list and clear the dropdown value
  const onPickUser = useCallback(
    (val: string) => {
      setDropdownValue(val);
      const found = dropdownOptions.find((o) => o.value === val);
      if (!found) return;
      const meta = found.meta as UserOption;
      if (selected.some((s) => s.id === meta.id)) {
        // Already selected; just clear select
        setTimeout(() => setDropdownValue(undefined), 0);
        return;
      }
      setSelected((prev) => [
        ...prev,
        {
          id: meta.id,
          name: meta.name,
          email: meta.email,
          phone: meta.phone,
          phoneDigits: meta.phoneDigits,
        },
      ]);
      // Clear control value so user can pick next
      setTimeout(() => setDropdownValue(undefined), 0);
    },
    [dropdownOptions, selected],
  );

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience !== "users" ||
      selectedUserIds.length > 0 ||
      selectedPhones.length > 0) &&
    (!sendWhatsApp || selectedPhones.length > 0) &&
    (audience !== "whatsapp" || selectedPhones.length > 0);

  async function handleSend() {
    if (!canSubmit) return;
    try {
      setLoading(true);
      type AdminAudiencePayload = {
        actorUserId: string;
        title: string;
        body: string;
        data?: Record<string, string>;
        audience: "admins" | "all";
      };
      type UsersPayload = {
        actorUserId: string;
        title: string;
        body: string;
        data?: Record<string, string>;
        userIds?: string[];
        phoneNumbers?: string[];
      };
      const data: Record<string, string> = { event: "broadcast" };
      if (link.trim()) data.link = link.trim();
      const base = {
        actorUserId,
        title: title.trim(),
        body: body.trim(),
        data,
      } as const;

      const requests: Array<AdminAudiencePayload | UsersPayload> = [];
      if (audience === "users") {
        // Prefer userIds for persistence/ownership; fallback to phoneNumbers if needed
        const usersPayload: UsersPayload = {
          ...base,
          userIds: selectedUserIds.length ? selectedUserIds : undefined,
          phoneNumbers:
            !selectedUserIds.length && selectedPhones.length
              ? selectedPhones
              : undefined,
        };
        requests.push(usersPayload);
        if (alsoNotifyAdmins) {
          requests.push({ ...base, audience: "admins" });
        }
      } else if (audience !== "whatsapp") {
        requests.push({ ...base, audience } as AdminAudiencePayload);
      }

      let totalSent = 0;
      let totalFailed = 0;

      // Send regular notifications (only if not WhatsApp-only mode)
      if (audience !== "whatsapp") {
        for (const payload of requests) {
          const res = await fetch("/api/notifications/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            const err =
              json?.error ||
              (Array.isArray(json?.errors) ? json.errors[0] : "Failed to send");
            throw new Error(err);
          }
          totalSent += Number(json?.sent || 0);
          totalFailed += Number(json?.failed || 0);
        }
      }

      // Send WhatsApp messages if enabled or if audience is whatsapp
      let whatsappSent = 0;
      let whatsappFailed = 0;
      if (
        (sendWhatsApp && selectedPhones.length > 0) ||
        audience === "whatsapp"
      ) {
        try {
          const phones = selectedPhones.map((phone) => {
            if (!phone.startsWith("+")) {
              return phone.startsWith("0")
                ? `+91${phone.substring(1)}`
                : `+91${phone}`;
            }
            return phone;
          });

          const message =
            whatsappMessage ||
            `${title.trim()}\n\n${body.trim()}${link.trim() ? `\n\n${link.trim()}` : ""}`;

          const waRes = await fetch("/api/whatsapp/send-bulk", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ phones, message }),
          });

          const waJson = await waRes.json().catch(() => ({}));
          if (waRes.ok && waJson.ok) {
            whatsappSent = Number(waJson.sent || 0);
            whatsappFailed = Number(waJson.failed || 0);
          } else {
            whatsappFailed = selectedPhones.length;
          }
        } catch (error) {
          console.error("WhatsApp send error:", error);
          whatsappFailed = selectedPhones.length;
        }
      }

      const totalMessages = totalSent + whatsappSent;
      const totalFailures = totalFailed + whatsappFailed;

      if (audience === "whatsapp") {
        toast.success(
          whatsappFailed > 0
            ? `Sent ${whatsappSent} WhatsApp messages. Failed: ${whatsappFailed}`
            : `Sent ${whatsappSent} WhatsApp messages`,
        );
      } else if (sendWhatsApp) {
        toast.success(
          totalFailures > 0
            ? `Sent ${totalSent} notifications, ${whatsappSent} WhatsApp messages. Failed: ${totalFailed} notifications, ${whatsappFailed} WhatsApp`
            : `Sent ${totalSent} notifications${whatsappSent > 0 ? ` and ${whatsappSent} WhatsApp messages` : ""}`,
        );
      } else {
        toast.success(
          totalFailures > 0
            ? `Sent ${totalSent}, failed ${totalFailures}`
            : `Sent ${totalSent} notifications`,
        );
      }

      // Save locally only if there is NO active Service Worker (to avoid duplicates).
      try {
        const hasSW =
          typeof navigator !== "undefined" && "serviceWorker" in navigator;
        let active = false;
        if (hasSW) {
          try {
            const reg = await navigator.serviceWorker.getRegistration();
            active = !!(reg?.active || navigator.serviceWorker.controller);
          } catch {
            active = !!navigator.serviceWorker?.controller;
          }
        }
        if (!active) {
          addLocal({
            type: "system",
            title: title.trim(),
            body: body.trim(),
            meta: {
              source: "broadcast",
              route: link.trim() ? { pathname: link.trim() } : undefined,
            },
          });
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
      setAlsoNotifyAdmins(false);
      setSendWhatsApp(false);
      setWhatsappMessage("");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to send notification";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Autofocus title when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut: Ctrl/Cmd + Enter to send
  function onKeyDown(e: React.KeyboardEvent) {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key === "Enter" &&
      canSubmit &&
      !loading
    ) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Send custom notification"
      size="lg"
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-400">
            Compose a message and choose who should receive it.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["admins", "all", "users", "whatsapp"] as Audience[]).map((key) => (
            <Button
              key={key}
              type="button"
              variant={audience === key ? "default" : "outline"}
              onClick={() => setAudience(key)}
              className={cn(
                "capitalize",
                audience === key ? "" : "bg-transparent",
                key === "whatsapp"
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-500"
                  : "",
              )}
            >
              {key === "users"
                ? "Specific users"
                : key === "whatsapp"
                  ? "📱 WhatsApp"
                  : key}
            </Button>
          ))}
        </div>

        {audience === "users" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Select users</label>
              <Dropdown
                options={dropdownOptions.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                value={dropdownValue}
                onValueChange={onPickUser}
                placeholder="Choose customer"
                searchable={true}
                searchPlaceholder="Search customers..."
                className="bg-gray-800 border-gray-700"
                minW
              />
              <p className="text-xs text-gray-500">
                We will send notifications to the selected users' phone numbers.
              </p>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                className="accent-white"
                checked={alsoNotifyAdmins}
                onChange={(e) => setAlsoNotifyAdmins(e.target.checked)}
              />
              Also notify admins
            </label>

            {audience === "users" && selectedPhones.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-green-400 border border-green-400/30 rounded px-2 py-1">
                <input
                  type="checkbox"
                  className="accent-green-500"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                />
                <span className="flex items-center gap-1">
                  📱 Also send WhatsApp message ({selectedPhones.length} phone
                  {selectedPhones.length !== 1 ? "s" : ""})
                </span>
              </label>
            )}

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md border border-gray-800 bg-gray-900 text-gray-200"
                  >
                    <span>{u.name}</span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white"
                      onClick={() =>
                        setSelected((prev) => prev.filter((s) => s.id !== u.id))
                      }
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

        {audience === "whatsapp" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-gray-300">Select users</label>
              <Dropdown
                options={dropdownOptions.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                value={dropdownValue}
                onValueChange={onPickUser}
                placeholder="Choose customer"
                searchable={true}
                searchPlaceholder="Search customers..."
                className="bg-gray-800 border-gray-700"
                minW
              />
              <p className="text-xs text-gray-500">
                We will send WhatsApp messages to the selected users' phone
                numbers.
              </p>
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md border border-gray-800 bg-gray-900 text-gray-200"
                  >
                    <span>{u.name}</span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white"
                      onClick={() =>
                        setSelected((prev) => prev.filter((s) => s.id !== u.id))
                      }
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
          <Input
            ref={titleRef}
            placeholder="e.g. System update"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-300">Message</label>
          <Textarea
            rows={4}
            placeholder="Write your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        {(sendWhatsApp || audience === "whatsapp") && (
          <div className="space-y-2">
            <label className="text-sm text-green-400">
              Custom WhatsApp Message (optional)
            </label>
            <Textarea
              rows={3}
              placeholder="Leave empty to use title + message + link"
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              onKeyDown={onKeyDown}
              className="border-green-400/30"
            />
            <p className="text-xs text-gray-500">
              If empty, we'll combine the title, message, and link for WhatsApp.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm text-gray-300">Deep link (optional)</label>
          <Input
            placeholder="/admin/billing or /customer/bills/123"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <p className="text-xs text-gray-500">
            The service worker will navigate to this path when users click the
            notification.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSubmit || loading}>
            {loading
              ? "Sending..."
              : audience === "whatsapp"
                ? "Send WhatsApp"
                : "Send"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
