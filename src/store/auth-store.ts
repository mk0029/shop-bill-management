import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, LoginCredentials, ProfileData } from "@/types";
import { userApiService } from "@/lib/sanity-api-service";
import { sanityClient } from "@/lib/sanity";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";
import { ensureFcmToken } from "@/lib/fcm";

type PersistedState = {
  state?: {
    user?: Partial<User> | null;
    role?: "admin" | "super_admin" | "technician" | "customer" | null;
    isAuthenticated?: boolean;
  };
  version?: number;
};

type AuthUser = Partial<User>;

interface AuthState {
  user: AuthUser | null;
  role: "admin" | "super_admin" | "technician" | "customer" | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileData) => Promise<void>;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      hydrated: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const response = await userApiService.loginUser(credentials);

          if (!response.success || !response.data) {
            throw new Error(response.error || "Authentication failed");
          }

          // Normalize: ensure user.id is present (map from Sanity _id)
          const userResp: any = response.data as any;
          const userNorm: any = { ...(userResp as any), id: userResp?.id || userResp?._id };

          set({
            user: userNorm as User,
            role: (userNorm as any).role,
            isAuthenticated: true,
            isLoading: false,
          });

          // Best-effort: silently ensure FCM token exists for this device if permission is already granted.
          // No prompts, no UI interaction.
          try {
            if (
              typeof Notification !== "undefined" &&
              Notification.permission === "granted"
            ) {
              const uid = (userNorm as any)?.id as string | undefined;
              if (uid) {
                Promise.resolve()
                  .then(() => ensureFcmToken({ userId: uid }))
                  .catch(() => {});
              }
            }
          } catch {
            // ignore
          }
        } catch (error) {
          console.error("❌ Login error:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear Zustand state
        set({
          user: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
        });
        // Also clear persisted storage cookie
        if (typeof document !== "undefined") {
          try {
            deleteCookie("auth-storage");
            deleteCookie("auth-remember");
          } catch (e) {
            // noop
          }
        }
      },

      updateProfile: async (data: ProfileData) => {
        const { user } = get();
        if (!user) throw new Error("No user logged in");

        set({ isLoading: true });
        try {
          // Update user in Sanity
          const updateData: {
            name: string;
            phone?: string;
            location?: string;
            profileImage?: string;
          } = {
            name: data.name,
          };

          if (data.phone) updateData.phone = data.phone;
          if (data.location) updateData.location = data.location;

          // Add profile image if provided
          if (data.profileImage) {
            updateData.profileImage = data.profileImage;
          }

          // Update the user document in Sanity
          const updatedUser = await sanityClient
            .patch((user as any).id || (user as any)._id)
            .set(updateData)
            .commit();

          // Update local state
          const updatedUserData: User = {
            ...(user as any),
            name: data.name,
            phone: data.phone,
            location: data.location,
            profileImage: data.profileImage || user.profileImage,
            updatedAt: new Date().toISOString(),
          };

          set({ user: updatedUserData, isLoading: false });
        } catch (error) {
          console.error("Error updating profile:", error);
          set({ isLoading: false });
          throw error;
        }
      },

      setUser: (user: User) => {
        // Normalize id on external set as well
        const norm: any = { ...(user as any), id: (user as any).id || (user as any)._id };
        set({
          user: norm as User,
          role: user.role,
          isAuthenticated: true,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => {
        if (typeof document === "undefined") return undefined as unknown as Storage;
        const cookieStorage = {
          getItem: (key: string) => {
            try {
              return getCookie(key);
            } catch {
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              const remember = getCookie("auth-remember") === "true";
              // If remember => persist for 30 days, else session cookie
              setCookie(key, value, {
                days: remember ? 30 : undefined,
                path: "/",
                sameSite: "Lax",
              });
            } catch {
              // noop
            }
          },
          removeItem: (key: string) => {
            try {
              deleteCookie(key);
            } catch {
              // noop
            }
          },
        } as Storage;
        return cookieStorage;
      }),
      partialize: (state) => {
        const u: any = state.user as any;
        const minimalUser = u
          ? {
              id: u.id || u._id,
              _id: u._id || u.id,
              customerId: u.customerId,
              role: u.role,
              name: u.name,
              email: u.email,
              phone: u.phone,
              location: u.location,
            }
          : null;

        return {
          user: minimalUser,
          role: state.role,
          isAuthenticated: state.isAuthenticated,
        };
      },
      onRehydrateStorage: () => (state, error) => {
        // mark store as hydrated whether successful or not
        useAuthStore.setState({ hydrated: true });
      },
    }
  )
);

// Synchronous pre-hydration to speed up startup
// This reads the persisted Zustand payload and applies it immediately
export function prehydrateAuth() {
  if (typeof window === "undefined") return;
  try {
    const key = "auth-storage";
    // Read from cookie
    const raw = getCookie(key);
    if (!raw) {
      useAuthStore.setState({ hydrated: true });
      return;
    }
    // Zustand persist format: { state: { user, role, isAuthenticated }, version: n }
    let parsedUnknown: unknown = null;
    try {
      parsedUnknown = JSON.parse(raw);
    } catch {
      parsedUnknown = null;
    }
    const parsed =
      typeof parsedUnknown === "object" && parsedUnknown !== null
        ? (parsedUnknown as PersistedState)
        : undefined;
    const st = parsed?.state;
    if (st && (st.user || st.isAuthenticated !== undefined)) {
      useAuthStore.setState({
        user: (st.user as AuthUser) ?? null,
        role: st.role ?? null,
        isAuthenticated: !!st.isAuthenticated,
        hydrated: true,
      });
    } else {
      useAuthStore.setState({ hydrated: true });
    }
  } catch {
    // best-effort
    useAuthStore.setState({ hydrated: true });
  }
}
