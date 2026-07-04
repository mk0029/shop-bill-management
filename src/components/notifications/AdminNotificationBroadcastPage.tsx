"use client";

import { FormEvent, useMemo, useState } from "react";
import BellRing from "lucide-react/dist/esm/icons/bell-ring.js";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import Eye from "lucide-react/dist/esm/icons/eye.js";
import ImageIcon from "lucide-react/dist/esm/icons/image.js";
import Megaphone from "lucide-react/dist/esm/icons/megaphone.js";
import Send from "lucide-react/dist/esm/icons/send.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Users from "lucide-react/dist/esm/icons/users.js";
import Wrench from "lucide-react/dist/esm/icons/wrench.js";
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
type ComposeMode = "template" | "custom";
type PublishMode = "instant" | "scheduled";
type Template = {
  label: string;
  title: string;
  message: string;
  category?: Category | string;
  ctaLabel?: string;
};

const TESTING_MODE = process.env.NEXT_PUBLIC_TESTING_MODE === "true";

const audienceOptions: Array<{
  value: Audience;
  label: string;
  helper: string;
  icon: typeof Users;
}> = [
  { value: "customers", label: "Customers", helper: "Customer app users", icon: Users },
  { value: "admins", label: "Admins", helper: "Admin and team devices", icon: BellRing },
  { value: "all", label: "Everyone", helper: "Customers and team", icon: Megaphone },
];

const categoryOptions: Array<{ value: Category; label: string }> = [
  { value: "special_offer", label: "Offer" },
  { value: "festival_offer", label: "Festival" },
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

const categoryTone: Record<Category, string> = {
  special_offer: "border-orange-300/25 bg-orange-500/10 text-orange-100",
  festival_offer: "border-fuchsia-300/25 bg-fuchsia-500/10 text-fuchsia-100",
  service_update: "border-cyan-300/25 bg-cyan-500/10 text-cyan-100",
  general: "border-slate-300/20 bg-white/[0.06] text-slate-100",
};

function categoryLabel(value?: string) {
  return categoryOptions.find((item) => item.value === value)?.label || "Template";
}

function templateCategory(template: Template): Category {
  const value = String(template.category || "special_offer");
  return categoryOptions.some((item) => item.value === value)
    ? (value as Category)
    : "special_offer";
}

function TemplateCard({
  template,
  onApply,
}: {
  template: Template;
  onApply: (template: Template) => void;
}) {
  const category = templateCategory(template);
  return (
    <button
      type="button"
      onClick={() => onApply(template)}
      className="group min-h-[132px] rounded-lg border border-white/10 bg-white/[0.055] p-4 text-left shadow-lg shadow-black/10 backdrop-blur-xl transition hover:border-cyan-200/30 hover:bg-white/[0.09]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-cyan-400/10 text-cyan-200">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">
              {template.label}
            </div>
            <div className="truncate text-xs text-slate-400">
              {template.title}
            </div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${categoryTone[category]}`}>
          {categoryLabel(category)}
        </span>
      </div>
      <p className="line-clamp-3 text-sm leading-5 text-slate-300">
        {template.message}
      </p>
    </button>
  );
}

export default function AdminNotificationBroadcastPage() {
  const [composeMode, setComposeMode] = useState<ComposeMode>("template");
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const { user } = useAuthStore();
  const currentUserId = String((user as any)?.id || (user as any)?._id || "");

  const templates = quickTemplates as Template[];
  const featuredTemplates = templates.slice(0, 8);
  const selectedAudience =
    audienceOptions.find((item) => item.value === audience) || audienceOptions[0];

  const canSend =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (composeMode === "custom" || Boolean(selectedTemplate)) &&
    (publishMode === "instant" || scheduledAt.trim().length > 0) &&
    !sending;

  const previewBody = useMemo(
    () => message.trim() || "Pick a template or write a short notification message.",
    [message],
  );

  function applyTemplate(template: Template) {
    setComposeMode("template");
    setSelectedTemplate(template);
    setTitle(template.title);
    setMessage(template.message);
    setCategory(templateCategory(template));
    if (template.ctaLabel) setCtaLabel(template.ctaLabel);
    setTemplatesOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    setSending(true);
    try {
      const targetLink =
        link.trim() ||
        (audience === "customers"
          ? "/customer/notifications"
          : "/admin/notifications");
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
          ctaUrl: targetLink,
          link: targetLink,
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
          ? `Notification scheduled for ${data.targetCount || 0} users`
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
            `Manual ${selectedAudience.label.toLowerCase()} test sent at ${new Date().toLocaleTimeString()}`,
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
      const sent = results.filter((result: any) => result?.status === "sent").length;
      const skipped = results.filter((result: any) => result?.status === "skipped").length;
      const failed = results.filter((result: any) => result?.status === "failed").length;
      const unregistered = Number(data?.skippedUnregistered || 0);
      toast.success(
        `Test: ${sent} sent, ${skipped} skipped, ${unregistered} unregistered, ${failed} failed`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send test notification",
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="min-h-[calc(var(--app-vh,100dvh)-var(--topbar-h,62px))] bg-transparent text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-black/15 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-cyan-400/10 text-cyan-200">
                <Megaphone className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-white sm:text-2xl">
                  Send Notifications
                </h1>
                <p className="text-sm text-slate-400">
                  Choose a template or write a custom message, then send it once through the backend dispatcher.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={() => setTemplatesOpen(true)}
                className="h-11 gap-2 border-cyan-200/20 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/15"
              >
                <Sparkles className="h-4 w-4" />
                All Templates
              </Button>
              {TESTING_MODE ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestNotification}
                  disabled={!currentUserId || testing}
                  className="h-11 border-orange-400/35 bg-orange-500/10 text-orange-100 hover:bg-orange-500/20"
                >
                  <BellRing className="mr-2 h-4 w-4" />
                  {testing ? "Testing..." : "Send Test"}
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <section className="hidden rounded-lg border border-white/10 bg-white/[0.045] p-4 shadow-xl shadow-black/10 backdrop-blur-xl sm:p-5 md:block">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">
                Pre-created Templates
              </h2>
              <p className="text-sm text-slate-400">
                Pick one to fill the form instantly.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplatesOpen(true)}
              className="hidden border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/[0.1] sm:inline-flex"
            >
              View All
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {featuredTemplates.map((template) => (
              <TemplateCard
                key={template.label}
                template={template}
                onApply={applyTemplate}
              />
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-black/15 backdrop-blur-xl sm:p-5"
          >
            <div className="mb-5 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-emerald-400/10 text-emerald-200">
                <Send className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Message Details
                </h2>
                <p className="text-sm text-slate-400">
                  Keep it short and clear for OS notifications.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <section className="space-y-3">
                <label className="text-sm font-medium text-slate-200">
                  Create From
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    {
                      value: "template",
                      label: "Template",
                      helper: "Pick ready content",
                      icon: Sparkles,
                    },
                    {
                      value: "custom",
                      label: "Custom Message",
                      helper: "Write manually",
                      icon: Megaphone,
                    },
                  ] as const).map((option) => {
                    const Icon = option.icon;
                    const selected = composeMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setComposeMode(option.value)}
                        className={`min-h-16 rounded-lg border p-3 text-left transition ${
                          selected
                            ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-50"
                            : "border-white/10 bg-slate-950/35 text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {option.helper}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {composeMode === "template" ? (
                <section className="space-y-3">
                  <label className="text-sm font-medium text-slate-200">
                    Template
                  </label>
                  {selectedTemplate ? (
                    <div className="rounded-lg border border-cyan-200/20 bg-cyan-400/10 p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {selectedTemplate.label}
                          </div>
                          <div className="text-xs text-cyan-100/70">
                            {selectedTemplate.title}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${categoryTone[templateCategory(selectedTemplate)]}`}>
                          {categoryLabel(templateCategory(selectedTemplate))}
                        </span>
                      </div>
                      <p className="text-sm leading-5 text-slate-300">
                        {selectedTemplate.message}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/35 p-4 text-sm text-slate-400">
                      Select a template before sending.
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTemplatesOpen(true)}
                    className="h-11 w-full border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {selectedTemplate ? "Change Template" : "Choose Template"}
                  </Button>
                </section>
              ) : null}

              <section className="space-y-3">
                <label className="text-sm font-medium text-slate-200">
                  Audience
                </label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {audienceOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = audience === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setAudience(option.value);
                          if (option.value === "customers") setLink("/customer/notifications");
                          if (option.value === "admins") setLink("/admin/notifications");
                          if (option.value === "all") setLink("/notifications");
                        }}
                        className={`min-h-16 rounded-lg border p-3 text-left transition ${
                          selected
                            ? "border-cyan-300/45 bg-cyan-400/12 text-cyan-50"
                            : "border-white/10 bg-slate-950/35 text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {option.helper}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {composeMode === "custom" ? (
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
                    classNameButton="!h-11 !min-h-11"
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
                    classNameButton="!h-11 !min-h-11"
                  />
                </div>
                </section>
              ) : null}

              {composeMode === "custom" ? (
                <section className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    Title
                  </label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={90}
                    placeholder="Wiring Material Offer"
                    className="h-11 text-slate-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    Message
                  </label>
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    maxLength={500}
                    rows={5}
                    placeholder="Write a clear notification message..."
                    className="min-h-32 text-slate-100"
                  />
                  <div className="text-right text-xs text-slate-500">
                    {message.length}/500
                  </div>
                </div>
                </section>
              ) : null}

              {composeMode === "custom" ? (
                <button
                type="button"
                onClick={() => setAdvancedOpen((value) => !value)}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-white/10 bg-slate-950/35 px-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06]"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-slate-400" />
                  Optional Details
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition ${advancedOpen ? "rotate-180" : ""}`}
                />
                </button>
              ) : null}

              {composeMode === "custom" && advancedOpen ? (
                <section className="grid gap-4 rounded-lg border border-white/10 bg-slate-950/25 p-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <ImageIcon className="h-4 w-4 text-blue-300" />
                      Image / Banner
                    </label>
                    <Input
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      placeholder="https://..."
                      className="text-slate-100"
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
                      className="text-slate-100"
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
                      className="text-slate-100"
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
                      className="text-slate-100"
                    />
                  </div>
                </section>
              ) : null}

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
                      className={`h-11 rounded-lg border text-sm font-medium capitalize transition ${
                        publishMode === mode
                          ? "border-emerald-300/45 bg-emerald-400/12 text-emerald-50"
                          : "border-white/10 bg-slate-950/35 text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      {mode === "instant" ? "Send now" : "Schedule"}
                    </button>
                  ))}
                </div>
                {publishMode === "scheduled" ? (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="text-slate-100"
                  />
                ) : null}
              </section>

              <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                {composeMode === "custom" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTemplatesOpen(true)}
                    className="h-11 border-white/10 bg-white/[0.06] text-slate-100 hover:bg-white/[0.1]"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Use Template
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  loading={sending}
                  disabled={!canSend}
                  className="h-11 min-w-36 gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                >
                  {publishMode === "scheduled" ? (
                    <CalendarClock className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {publishMode === "scheduled" ? "Schedule" : "Send Now"}
                </Button>
              </div>
            </div>
          </form>

          <aside className="rounded-lg border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-black/15 backdrop-blur-xl lg:sticky lg:top-20 lg:h-fit">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Eye className="h-4 w-4 text-cyan-200" />
              Preview
            </div>
            <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/45">
              {imageUrl.trim() ? (
                <div className="aspect-[16/7] overflow-hidden border-b border-white/10 bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl.trim()}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <div className="flex items-start gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-400/10 text-cyan-200">
                  <BellRing className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-sm font-semibold text-white">
                    {title.trim() || "Notification title"}
                  </div>
                  <div className="mt-1 line-clamp-5 text-sm leading-5 text-slate-300">
                    {previewBody}
                  </div>
                  {ctaLabel.trim() ? (
                    <div className="mt-3 inline-flex h-8 items-center rounded-md bg-cyan-500 px-3 text-xs font-semibold text-slate-950">
                      {ctaLabel.trim()}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-4 py-3 text-xs text-slate-400">
                <div>
                  <span className="block text-slate-500">Audience</span>
                  {selectedAudience.label}
                </div>
                <div>
                  <span className="block text-slate-500">Type</span>
                  {categoryLabel(category)}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Modal
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title="Pre-created Templates"
        size="xl"
        className="h-[100dvh] max-h-[100dvh] rounded-none border-white/10 bg-slate-950/92 sm:h-fit sm:max-h-[90dvh] sm:rounded-lg"
      >
        <div className="grid max-h-[calc(100dvh-8rem)] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.label}
              template={template}
              onApply={applyTemplate}
            />
          ))}
        </div>
      </Modal>
    </main>
  );
}
