"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail } from "lucide-react";

export default function RequestAccountSection({
  support,
}: {
  support: { email: string; whatsapp: string };
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    location: "",
    requirement: "",
    channel: "whatsapp" as "whatsapp" | "email",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const summary = `Customer Account Request\nName: ${form.name}\nMobile: ${form.phone}\nLocation: ${form.location}\nRequirement: ${form.requirement || "-"}`;

    if (form.channel === "whatsapp") {
      const msg = encodeURIComponent(summary);
      const wa = `https://wa.me/${support.whatsapp.replace(/[^0-9]/g, "")}?text=${msg}`;
      window.open(wa, "_blank");
    } else {
      const subject = encodeURIComponent("Customer Account Request");
      const body = encodeURIComponent(summary);
      const mailto = `mailto:${support.email}?subject=${subject}&body=${body}`;
      window.open(mailto, "_blank");
    }
  };

  return (
    <section className="container mx-auto px-4 py-14 md:py-20" id="request">
      <div className="grid  gap-10 items-start">
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">
            Request Your Customer Account
          </h2>
          <p className="mt-3 text-muted-foreground mx-auto max-w-[768px]">
            Get a personal customer account for service history and billing. No
            login needed now — just send your details via WhatsApp or Email. We
            will create your account and contact you for confirmation.
          </p>
        </div>
        <Card className="max-w-[880px] w-full mx-auto">
          <CardHeader>
            <CardTitle>Quick Request Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Full Name</label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Mobile Number</label>
                <Input
                  required
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="e.g. 9876543210"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Location / Village</label>
                <Input
                  required
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="Your area"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">
                  Service Requirement (Optional)
                </label>
                <Textarea
                  value={form.requirement}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, requirement: e.target.value }))
                  }
                  placeholder="Briefly describe your need"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="channel"
                    className="h-4 w-4"
                    checked={form.channel === "whatsapp"}
                    onChange={() =>
                      setForm((f) => ({ ...f, channel: "whatsapp" }))
                    }
                  />
                  WhatsApp
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="channel"
                    className="h-4 w-4"
                    checked={form.channel === "email"}
                    onChange={() =>
                      setForm((f) => ({ ...f, channel: "email" }))
                    }
                  />
                  Email
                </label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  {form.channel === "whatsapp" ? (
                    <>
                      <MessageCircle className="mr-2 h-5 w-5" /> Send on
                      WhatsApp
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-5 w-5" /> Send via Email
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
