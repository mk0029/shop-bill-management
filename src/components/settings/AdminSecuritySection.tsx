"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export default function AdminSecuritySection() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [busy, setBusy] = React.useState(false);
  const [secret, setSecret] = React.useState<string | null>(null);

  const onRegenerate = async () => {
    if (!user?.id) {
      toast.error("No user in session");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${user.id}/regenerate-secret`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "Failed");
      const newKey = json?.data?.secretKey as string | undefined;
      const updatedUser = json?.data?.user;
      if (newKey) setSecret(newKey);
      if (updatedUser) setUser(updatedUser);
      toast.success("Secret key regenerated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to regenerate secret";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="border-b border-white/5 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Shield className="h-4 w-4 text-emerald-300/90" /> Security
        </h2>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <p className="text-xs text-slate-400">Regenerate your admin secret key. Share it securely; it replaces the previous key immediately.</p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={onRegenerate}
            disabled={busy}
            className="w-fit rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-200 shadow-[0_0_16px_rgba(244,63,94,0.12)] backdrop-blur-xl transition-all duration-200 hover:bg-rose-500/25 hover:border-rose-400/50 active:scale-95 disabled:opacity-50"
          >
            {busy ? "Working..." : "Regenerate Secret Key"}
          </Button>
          {secret && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 text-sm text-slate-200 break-all backdrop-blur-xl">
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">New Secret Key</div>
              <div className="font-mono text-emerald-200">{secret}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
