"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

const ADMIN_WELCOME_PREFIX = "admin_welcome_seen";
const staffRoles = new Set(["admin", "super_admin", "technician"]);

function seenKey(userId?: string) {
  return `${ADMIN_WELCOME_PREFIX}:${userId || "guest"}`;
}

function hasSeen(userId?: string) {
  try {
    return window.localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    return false;
  }
}

export default function AdminWelcomeGate() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const user = useAuthStore((s) => s.user) as
    | { id?: string; _id?: string; role?: string }
    | null;
  const role = useAuthStore((s) => s.role);
  const hydrated = useAuthStore((s) => s.hydrated);
  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!hydrated || !role || !staffRoles.has(role)) return;
    if (pathname === "/admin/welcome") return;
    if (hasSeen(userId)) return;
    router.replace("/admin/welcome");
  }, [hydrated, pathname, role, router, userId]);

  return null;
}
