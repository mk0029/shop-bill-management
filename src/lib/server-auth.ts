import { cookies } from "next/headers";

export type ServerAuth = {
  isAuthenticated: boolean;
  role: "admin" | "customer" | null;
  userId: string | null;
  customerId: string | null;
  user: Record<string, unknown> | null;
};

export async function getServerAuth(): Promise<ServerAuth> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("auth-storage")?.value;
    if (!raw) {
      return {
        isAuthenticated: false,
        role: null,
        userId: null,
        customerId: null,
        user: null,
      };
    }

    const parsedUnknown: unknown = JSON.parse(raw);
    const parsed =
      typeof parsedUnknown === "object" && parsedUnknown !== null
        ? (parsedUnknown as { state?: { user?: Record<string, unknown>; role?: string; isAuthenticated?: boolean } })
        : undefined;

    const st = parsed?.state;
    const user = (st?.user ?? null) as Record<string, unknown> | null;
    const role = (st?.role as "admin" | "customer" | null) ?? null;
    const userId = (user?.id as string) || (user?._id as string) || null;
    const customerId = (user?.customerId as string) || null;
    const isAuthenticated = Boolean(st?.isAuthenticated);

    return {
      isAuthenticated,
      role,
      userId,
      customerId,
      user,
    };
  } catch {
    return {
      isAuthenticated: false,
      role: null,
      userId: null,
      customerId: null,
      user: null,
    };
  }
}
