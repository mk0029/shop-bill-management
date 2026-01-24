"use client";

import { useEffect } from "react";
import { useAuthStore } from "../../store/auth-store";
import { initFCM } from "../../lib/fcm-client";

// Initializes FCM in the admin portal and registers token for the current user
export default function AdminFCMInitializer() {
  const { user: adminUser, isAuthenticated, hydrated } = useAuthStore();

  const admin = (adminUser || null) as unknown as {
    id?: string;
    _id?: string;
    userId?: string;
  } | null;
  const uid = admin?.id || admin?._id || admin?.userId || null;

  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    if (!uid) return;
    const cleanup = initFCM(() => uid || null);
    return () => {
      cleanup();
    };
  }, [uid, hydrated, isAuthenticated]);

  return null;
}
