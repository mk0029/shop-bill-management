"use client";

import { FormEvent, useMemo, useState } from "react";
import BellRing from "lucide-react/dist/esm/icons/bell-ring.js";
import Megaphone from "lucide-react/dist/esm/icons/megaphone.js";
import Send from "lucide-react/dist/esm/icons/send.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import Users from "lucide-react/dist/esm/icons/users.js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Audience = "customers" | "admins" | "all";
type Category = "special_offer" | "festival_offer" | "service_update" | "general";

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

const quickTemplates = [
  {
    label: "5% Off",
    title: "5% Off Today",
    message: "Get 5% off on selected electrical services today. Book your service with Jambh Electrics now.",
  },
  {
    label: "10% Off",
    title: "10% Service Discount",
    message: "Enjoy 10% off on service charges for a limited time. Contact Jambh Electrics to book your visit.",
  },
  {
    label: "15% Off",
    title: "15% Festival Discount",
    message: "Festival special: get 15% off on selected electrical work. Offer valid for a limited time.",
  },
  {
    label: "Lights 5%",
    title: "5% Off on Lights",
    message: "Festival purchase offer: get 5% off on selected lights and decorative lights at Jambh Electrics.",
  },
  {
    label: "Decor 10%",
    title: "10% Off on Decoration Lights",
    message: "Brighten your festival celebrations with 10% off on selected decoration lights for a limited time.",
  },
  {
    label: "Diwali Lights",
    title: "Diwali Lights Offer",
    message: "Diwali special: get festival discount on LED lights, decoration lights, and fitting support.",
  },
  {
    label: "LED Bulbs",
    title: "LED Bulb Purchase Offer",
    message: "Buy LED bulbs and selected lighting products with special festival discount at Jambh Electrics.",
  },
  {
    label: "Light Combo",
    title: "Lights Combo Offer",
    message: "Buy lights and decoration lights together and get extra discount on your purchase.",
  },
  {
    label: "20% Off",
    title: "20% Off on Big Work",
    message: "Get 20% off on major wiring, fitting, or maintenance work above the minimum billing amount.",
  },
  {
    label: "Switches 5%",
    title: "5% Off on Switches",
    message: "Festival offer: get 5% off on selected switches, sockets, and electrical accessories.",
  },
  {
    label: "Fan Buy",
    title: "Fan Purchase Discount",
    message: "Get a special festival discount on selected fan purchases and fitting service.",
  },
  {
    label: "Wire Offer",
    title: "Wiring Material Offer",
    message: "Purchase selected wiring material and get festival discount for a limited time.",
  },
  {
    label: "Home Combo",
    title: "Home Electrical Combo Offer",
    message: "Buy lights, switches, sockets, and fitting items together and get a special combo discount.",
  },
  {
    label: "Visit Off",
    title: "Visit Charge Discount",
    message: "Book today and get a discount on visit charges for home electrical service.",
  },
  {
    label: "Free Checkup",
    title: "Free Checkup with Service",
    message: "Get a free basic electrical checkup with any paid repair or fitting service.",
  },
  {
    label: "AC Discount",
    title: "AC Service Discount",
    message: "Get a special discount on AC servicing and electrical checking. Book your slot today.",
  },
  {
    label: "Fan Repair",
    title: "Fan Repair Discount",
    message: "Fan repair offer: get a discount on repair service charges for a limited time.",
  },
  {
    label: "LED Offer",
    title: "LED Fitting Discount",
    message: "Upgrade to LED lighting and get a special discount on fitting charges.",
  },
  {
    label: "Combo Offer",
    title: "Repair + Fitting Combo Offer",
    message: "Book repair and fitting work together and get an extra discount on total service charges.",
  },
  {
    label: "New Customer",
    title: "New Customer Discount",
    message: "First-time customers get a special discount on their first service booking with Jambh Electrics.",
  },
  {
    label: "Shop Offer",
    title: "Shop Maintenance Discount",
    message: "Get a special discount on shop electrical maintenance and safety checking.",
  },
  {
    label: "Monsoon Off",
    title: "Monsoon Safety Discount",
    message: "Monsoon offer: get discounted electrical safety checks for wiring, sockets, and earthing.",
  },
  {
    label: "Limited Deal",
    title: "Limited Time Discount",
    message: "Limited time deal: get extra discount on selected electrical services. Book before the offer ends.",
  },
];

export default function AdminNotificationBroadcastPage() {
  const [audience, setAudience] = useState<Audience>("customers");
  const [category, setCategory] = useState<Category>("special_offer");
  const [title, setTitle] = useState("Special Day Offer");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/customer/notifications");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [sending, setSending] = useState(false);

  const canSend = title.trim().length > 0 && message.trim().length > 0 && !sending;
  const previewBody = useMemo(
    () => message.trim() || "Your notification message will appear here.",
    [message],
  );

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
          link: link.trim() || undefined,
          expiresInHours,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "Failed to send notification");
      }
      toast.success(`Notification sent to ${data.targetCount || 0} users`);
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send notification");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/15 text-blue-300">
              <Megaphone className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-normal text-white sm:text-2xl">
                Send Notifications
              </h1>
              <p className="text-sm text-slate-400">
                Broadcast special day offers, service updates, and announcements.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/15 sm:p-5"
          >
            <section className="space-y-3">
              <label className="text-sm font-medium text-slate-200">Audience</label>
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
                <label className="text-sm font-medium text-slate-200">Type</label>
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
                <label className="text-sm font-medium text-slate-200">Expires After</label>
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
                <label className="text-sm font-medium text-slate-200">Title</label>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={90}
                  placeholder="Special Day Offer"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Message</label>
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={500}
                  rows={6}
                  placeholder="Write the offer or announcement..."
                  className="min-h-36 border-slate-700 bg-slate-950 text-slate-100"
                />
                <div className="text-right text-xs text-slate-500">{message.length}/500</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Open Link</label>
                <Input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="/customer/notifications"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Quick Templates</label>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {quickTemplates.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => {
                      setTitle(template.title);
                      setMessage(template.message);
                    }}
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
                  <div className="line-clamp-2 text-sm font-semibold text-white">
                    {title.trim() || "Notification title"}
                  </div>
                  <div className="mt-1 line-clamp-4 text-sm leading-5 text-slate-300">
                    {previewBody}
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500">
                Audience: {audienceOptions.find((item) => item.value === audience)?.label}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
