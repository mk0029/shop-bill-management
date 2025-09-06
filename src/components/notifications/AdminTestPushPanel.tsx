"use client";

import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminUserLike = {
  id?: string;
  _id?: string;
  userId?: string;
  name?: string;
  email?: string;
};

export default function AdminTestPushPanel() {
  const { user } = useUser();
  const { user: adminUser } = useAuthStore();
  const [loading, setLoading] = useState<"me" | "uid" | "admins" | "all" | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [lastError, setLastError] = useState<string | null>(null);

  // Resolve a userId from either Clerk or the local admin auth store
  const admin: AdminUserLike | null = (adminUser as unknown as AdminUserLike) || null;
  const clerkUsername: string | undefined = typeof (user as unknown as { username?: unknown })?.username === 'string'
    ? (user as unknown as { username?: string }).username
    : undefined;
  const resolvedUid = user?.id || admin?.id || admin?._id || admin?.userId || null;
  const resolvedName = (user?.firstName || clerkUsername || admin?.name || admin?.email || "there");
  // Consider logged in if we can resolve a userId from any source
  const isLoggedIn = Boolean(resolvedUid);

  const sendRich = useCallback(
    async (payload: {
      title: string;
      body: string;
      userIds?: string[];
      audience?: "admins" | "all";
    }) => {
      try {
        setLastError(null);
        const res = await fetch("/api/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            sound: "default",
            data: {
              type: "billing",
              test: "1",
              icon: "/je-192.ico",
              badge: "/je-192.ico",
              image: "/globe.png",
              billId: "BILL-TEST-123",
              // For deep-link testing in service worker
              role: payload.audience ? (payload.audience === 'admins' ? 'admin' : 'customer') : (payload.userIds && payload.userIds.length ? 'customer' : 'admin'),
              // Replace with a real customer slug/id when testing admin flows
              customerId: "demo-customer",
            },
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          const apiErr = json?.error || (Array.isArray(json?.errors) ? json.errors.join(", ") : "Send failed");
          setLastError(apiErr);
          throw new Error(apiErr);
        }
        toast.success("Test notification sent");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to send test notification'
        toast.error(msg);
      }
    },
    []
  );

  const sendToMe = useCallback(async () => {
    if (!isLoggedIn || !resolvedUid) {
      toast.error("Please sign in to send test notifications");
      return;
    }
    setLoading("me");
    await sendRich({
      title: "Test notification",
      body: `Hello ${resolvedName}! This is a rich test.`,
      userIds: [resolvedUid],
    });
    setLoading(null);
  }, [isLoggedIn, resolvedUid, resolvedName, sendRich]);

  const sendToUid = useCallback(async () => {
    const uid = targetUserId.trim();
    if (!uid) {
      toast.error("Enter a userId to send");
      return;
    }
    setLoading("uid");
    await sendRich({
      title: "Test notification",
      body: `Hello ${uid}! This is a rich test.`,
      userIds: [uid],
    });
    setLoading(null);
  }, [targetUserId, sendRich]);

  const sendToAdmins = useCallback(async () => {
    setLoading("admins");
    await sendRich({
      title: "Admin broadcast",
      body: "This is a rich test to all admins.",
      audience: "admins",
    });
    setLoading(null);
  }, [sendRich]);

  const sendToAll = useCallback(async () => {
    setLoading("all");
    await sendRich({
      title: "Global broadcast",
      body: "This is a rich test to all users.",
      audience: "all",
    });
    setLoading(null);
  }, [sendRich]);

  return (
    <div className="mb-6 p-4 border border-gray-800 rounded-lg bg-gray-900">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white font-semibold">Test Push Notifications</h2>
        <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300 border border-gray-700">
          {resolvedUid ? `Testing as: ${resolvedUid}` : "Not signed in"}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Use these buttons to send end-to-end rich notifications (icon, badge, image, actions).
        Ensure the service worker is active and notification permission is granted.
      </p>
      {lastError && (
        <div className="mb-3 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded px-3 py-2">
          API error: {lastError}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <Button onClick={sendToMe} disabled={loading !== null} variant="default">
          {loading === "me" ? "Sending..." : "Send to me"}
        </Button>
        <div className="flex gap-2 items-end w-full sm:w-auto">
          <Input
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="Target userId"
            className="w-64"
          />
          <Button onClick={sendToUid} disabled={loading !== null} variant="secondary">
            {loading === "uid" ? "Sending..." : "Send to userId"}
          </Button>
        </div>
        <Button onClick={sendToAdmins} disabled={loading !== null} variant="outline">
          {loading === "admins" ? "Sending..." : "Send to admins"}
        </Button>
        <Button onClick={sendToAll} disabled={loading !== null} variant="destructive">
          {loading === "all" ? "Sending..." : "Send to all users"}
        </Button>
      </div>
    </div>
  );
}
