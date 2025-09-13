"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5" /> Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-300">
        <p>Regenerate your admin secret key. Share it securely; it replaces the previous key immediately.</p>
        <div className="flex flex-col gap-2">
          <Button onClick={onRegenerate} disabled={busy} className="bg-red-600 hover:bg-red-500">
            {busy ? "Working..." : "Regenerate Secret Key"}
          </Button>
          {secret && (
            <div className="rounded-md bg-gray-800 p-3 text-gray-100 break-all">
              <div className="text-xs text-gray-400 mb-1">New Secret Key</div>
              <div className="font-mono">{secret}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
