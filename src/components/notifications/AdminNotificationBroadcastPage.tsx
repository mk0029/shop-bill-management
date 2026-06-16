"use client";

import { FormEvent, useMemo, useState } from "react";
import BellRing from "lucide-react/dist/esm/icons/bell-ring.js";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock.js";
import Image from "lucide-react/dist/esm/icons/image.js";
import Megaphone from "lucide-react/dist/esm/icons/megaphone.js";
import Send from "lucide-react/dist/esm/icons/send.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Users from "lucide-react/dist/esm/icons/users.js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/auth-store";
import { SHOP_CHAT_URL } from "@/lib/shop-chat/api";
import { shopChatHeaders } from "@/lib/shop-chat/auth";
import quickTemplates from "./quick-templates.json";

type Audience = "customers" | "admins" | "all";
type Category =
  | "special_offer"
  | "festival_offer"
  | "service_update"
  | "general";
type PublishMode = "instant" | "scheduled";

const TESTING_MODE = process.env.NEXT_PUBLIC_TESTING_MODE === "true";
const audienceOptions: Array<{
  value: Audience;
  label: string;
  icon: typeof Users;
}> = [
  { value: "customers", label: "Customers", icon: Users },
  { value: "admins", label: "Admins", icon: BellRing },
  { value: "all", label: "Everyone", icon: Megaphone },
];

const categoryOptions: Array<{ value: Category; label: string }> = [
  { value: "special_offer", label: "Special Day Offer" },
  { value: "festival_offer", label: "Festival Offer" },
  { value: "service_update", label: "Service Update" },
  { value: "general", label: "General" },
];

const expiryOptions = [
  { value: "12", label: "12 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "2 days" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" },
];

export default function AdminNotificationBroadcastPage() {
  const [audience, setAudience] = useState<Audience>("customers");
  const [category, setCategory] = useState<Category>("special_offer");
  const [title, setTitle] = useState("Special Day Offer");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/customer/notifications");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [imageUrl, setImageUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("View Offer");
  const [expiryDate, setExpiryDate] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("instant");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const { user } = useAuthStore();
  const currentUserId = String((user as any)?.id || (user as any)?._id || "");

  const canSend =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (publishMode === "instant" || scheduledAt.trim().length > 0) &&
    !sending;
  const previewBody = useMemo(
    () => message.trim() || "Your notification message will appear here.",
    [message],
  );

  function applyTemplate(template: (typeof quickTemplates)[number]) {
    setTitle(template.title);
    setMessage(template.message);
    setTemplatesOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    setSending(true);
    try {
      const response = await fetch("/api/notifications/custom-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          category,
          title: title.trim(),
          message: message.trim(),
          imageUrl: imageUrl.trim() || undefined,
          ctaLabel: ctaLabel.trim() || undefined,
          ctaUrl: link.trim() || undefined,
          link: link.trim() || undefined,
          expiryDate: expiryDate || undefined,
          scheduledAt: publishMode === "scheduled" ? scheduledAt : undefined,
          expiresInHours,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "Failed to send notification");
      }
      toast.success(
        data?.scheduled
          ? `Promotion scheduled for ${data.targetCount || 0} users`
          : `Notification sent to ${data.targetCount || 0} users`,
      );
      setMessage("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send notification",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleTestNotification() {
    if (!TESTING_MODE || !currentUserId || testing) return;
    const selectedAudience =
      audienceOptions.find((item) => item.value === audience)?.label ||
      "selected users";
    setTesting(true);
    try {
      const response = await fetch(`${SHOP_CHAT_URL}/notifications/test-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...shopChatHeaders() },
        credentials: "include",
        body: JSON.stringify({
          eventType: "system.general",
          eventId: `admin.manual-test.${audience}.${Date.now()}`,
          actorUserId: currentUserId,
          audience,
          title: title.trim() || "Backend FCM test",
          body:
            message.trim() ||
            `Manual ${selectedAudience.toLowerCase()} test sent at ${new Date().toLocaleTimeString()}`,
          data: {
            route:
              audience === "customers"
                ? "/customer/notifications"
                : "/admin/notifications",
            source: "admin_manual_test",
            audience,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "Failed to send test notification");
      }
      const results = Array.isArray(data?.results) ? data.results : [];
      const sent = results.filter(
        (result: any) => result?.status === "sent",
      ).length;
      const skipped = results.filter(
        (result: any) => result?.status === "skipped",
      ).length;
      const failedResults = results.filter(
        (result: any) => result?.status === "failed",
      );
      const failed = failedResults.length;
      const firstFailure = failedResults[0]?.failureReason
        ? `: ${failedResults[0].failureReason}`
        : "";
      const unregistered = Number(data?.skippedUnregistered || 0);
      toast.success(
        `Test sent to ${selectedAudience}: ${sent} sent, ${skipped} skipped, ${unregistered} unregistered, ${failed} failed${firstFailure}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send test notification",
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/15 text-blue-300">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-normal text-white sm:text-2xl">
                Send Notifications
              </h1>
              <p className="text-sm text-slate-400">
                Broadcast special day offers, service updates, and
                announcements.
              </p>
            </div>
          </div>
          {TESTING_MODE ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleTestNotification}
              disabled={!currentUserId || testing}
              className="w-full border-orange-400/40 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20 sm:w-auto"
            >
              <BellRing className="mr-2 h-4 w-4" />
              {testing
                ? "Testing..."
                : `Send Test to ${audienceOptions.find((item) => item.value === audience)?.label || "Audience"}`}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/15 sm:p-5"
          >
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <Sparkles className="h-4 w-4 text-orange-300" />
                Offer / Promotion Popup
              </div>
              <label className="text-sm font-medium text-slate-200">
                Target Audience
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {audienceOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = audience === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAudience(option.value)}
                      className={`flex h-12 items-center justify-center gap-2 rounded-md border text-sm font-medium transition ${
                        selected
                          ? "border-blue-400 bg-blue-500/15 text-blue-100"
                          : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Type
                </label>
                <Dropdown
                  options={categoryOptions}
                  value={category}
                  onValueChange={(value) => setCategory(value as Category)}
                  placeholder="Select type"
                  removeSearchForce
                  classNameButton="!h-11 !min-h-11 border-slate-700 bg-slate-950 hover:bg-slate-900"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Expires After
                </label>
                <Dropdown
                  options={expiryOptions}
                  value={String(expiresInHours)}
                  onValueChange={(value) => setExpiresInHours(Number(value))}
                  placeholder="Select expiry"
                  removeSearchForce
                  classNameButton="!h-11 !min-h-11 border-slate-700 bg-slate-950 hover:bg-slate-900"
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={90}
                  placeholder="Special Day Offer"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Description
                </label>
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={500}
                  rows={6}
                  placeholder="Write the offer or announcement..."
                  className="min-h-36 border-slate-700 bg-slate-950 text-slate-100"
                />
                <div className="text-right text-xs text-slate-500">
                  {message.length}/500
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Image className="h-4 w-4 text-blue-300" />
                  Image / Banner
                </label>
                <Input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  CTA Button
                </label>
                <Input
                  value={ctaLabel}
                  onChange={(event) => setCtaLabel(event.target.value)}
                  placeholder="View Offer"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  CTA Link
                </label>
                <Input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="/customer/notifications"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  Expiry Date
                </label>
                <Input
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
            </section>

            <section className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <CalendarClock className="h-4 w-4 text-emerald-300" />
                Publishing
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["instant", "scheduled"] as PublishMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPublishMode(mode)}
                    className={`h-11 rounded-md border text-sm font-medium capitalize transition ${
                      publishMode === mode
                        ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                        : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {publishMode === "scheduled" ? (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              ) : null}
            </section>

            <section className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Quick Templates
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTemplatesOpen(true)}
                className="flex h-11 w-full items-center justify-center gap-2 border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-900 sm:hidden"
              >
                <Sparkles className="h-4 w-4" />
                Open Templates
              </Button>
              <div className="hidden gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-3">
                {quickTemplates.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-left text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {template.label}
                  </button>
                ))}
              </div>
            </section>

            <div className="flex justify-end border-t border-slate-800 pt-4">
              <Button
                type="submit"
                loading={sending}
                disabled={!canSend}
                className="min-w-32 gap-2 bg-blue-600 text-white hover:bg-blue-500"
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </form>

          <aside className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/15">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <BellRing className="h-4 w-4 text-blue-300" />
              Preview
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
              <div className="flex items-start gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500/15 text-orange-300">
                  <BellRing className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  {imageUrl.trim() ? (
                    <div className="mb-3 aspect-[16/7] overflow-hidden rounded-md border border-slate-800 bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl.trim()}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="line-clamp-2 text-sm font-semibold text-white">
                    {title.trim() || "Notification title"}
                  </div>
                  <div className="mt-1 line-clamp-4 text-sm leading-5 text-slate-300">
                    {previewBody}
                  </div>
                  {ctaLabel.trim() ? (
                    <div className="mt-3 inline-flex h-8 items-center rounded-md bg-blue-600 px-3 text-xs font-semibold text-white">
                      {ctaLabel.trim()}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
                Audience:{" "}
                {audienceOptions.find((item) => item.value === audience)?.label}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Modal
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title="Quick Templates"
        size="md"
        className="h-[100dvh] max-h-[100dvh] rounded-none border-slate-800 bg-slate-950 sm:mt-0 sm:h-fit sm:max-h-[90dvh] sm:rounded-lg"
      >
        <div className="grid max-h-[calc(100dvh-5.5rem)] gap-2 overflow-y-auto pr-1">
          {quickTemplates.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => applyTemplate(template)}
              className="flex min-h-12 items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm font-medium text-slate-100 transition hover:border-blue-400 hover:bg-blue-500/10"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-blue-300" />
              <span className="min-w-0 truncate">{template.label}</span>
            </button>
          ))}
        </div>
      </Modal>
    </main>
  );
}
