"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { userApiService } from "@/lib/sanity-api-service";

export default function AuthRoleSync() {
  const { hydrated, isAuthenticated, user, role, setUser } = useAuthStore();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) return;
    if (ranRef.current) return;

    const userId = (user as any)?.id || (user as any)?._id;
    if (!userId) return;

    ranRef.current = true;

    (async () => {
      try {
        const resp = await userApiService.getUserById(String(userId));
        if (!resp?.success || !resp.data) return;
        const nextUser: any = resp.data;
        const nextRole = nextUser?.role as any;

        if (nextRole && nextRole !== role) {
          setUser({ ...nextUser, id: nextUser?.id || nextUser?._id } as any);
        }
      } catch {
        // ignore
      }
    })();
  }, [hydrated, isAuthenticated, user, role, setUser]);

  return null;
}
