import { useAuthStore } from "@/store/auth-store";
import { useMemo } from "react";

type UserStoreShape = {
  user: { id?: string; username?: string; email?: string } | null;
  token?: string | null;
};

export function useUserStore<T>(selector?: (state: UserStoreShape) => T): T | UserStoreShape {
  const raw = useAuthStore(
    (s) => s.user as { _id?: string; id?: string; name?: string; email?: string } | null,
  );

  const mapped = useMemo<UserStoreShape>(
    () => ({
      user: raw
        ? {
            id: String(raw._id || raw.id || ""),
            username: raw.name || raw.email || "User",
            email: raw.email,
          }
        : null,
      token: null,
    }),
    [raw?._id, raw?.id, raw?.name, raw?.email],
  );

  return selector ? selector(mapped) : mapped;
}
