import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User, LoginCredentials, ProfileData } from "@/types";
import { userApiService } from "@/lib/sanity-api-service";
import { sanityClient } from "@/lib/sanity";

interface AuthState {
  user: User | null;
  role: "admin" | "customer" | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const response = await userApiService.loginUser(credentials);

          if (!response.success || !response.data) {
            throw new Error(response.error || "Authentication failed");
          }

          const user: User = response.data;

          set({
            user,
            role: user.role,
            isAuthenticated: true,
            isLoading: false,
          });
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
        // Also clear persisted storage in both localStorage and sessionStorage
        if (typeof window !== "undefined") {
          try {
            const key = "auth-storage";
            window.localStorage.removeItem(key);
            window.sessionStorage.removeItem(key);
            window.localStorage.removeItem("auth-remember");
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
            phone: string;
            location: string;
            profileImage?: string;
          } = {
            name: data.name,
            phone: data.phone,
            location: data.location,
          };

          // Add profile image if provided
          if (data.profileImage) {
            updateData.profileImage = data.profileImage;
          }

          // Update the user document in Sanity
          const updatedUser = await sanityClient
            .patch(user.id)
            .set(updateData)
            .commit();

          // Update local state
          const updatedUserData: User = {
            ...user,
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
        set({
          user,
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
        if (typeof window === "undefined") return undefined as unknown as Storage;
        const dynamicStorage = {
          getItem: (key: string) => {
            try {
              const fromLocal = window.localStorage.getItem(key);
              if (fromLocal != null) return fromLocal;
              return window.sessionStorage.getItem(key);
            } catch {
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              const remember = window.localStorage.getItem("auth-remember") === "true";
              if (remember) {
                window.localStorage.setItem(key, value);
                // ensure session copy is removed to avoid duplicates
                window.sessionStorage.removeItem(key);
              } else {
                window.sessionStorage.setItem(key, value);
                // avoid persisting in local when not remembering
                window.localStorage.removeItem(key);
              }
            } catch {
              // noop
            }
          },
          removeItem: (key: string) => {
            try {
              window.localStorage.removeItem(key);
              window.sessionStorage.removeItem(key);
            } catch {
              // noop
            }
          },
        } as Storage;
        return dynamicStorage;
      }),
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          // Optional validation or logging
        }
      },
    }
  )
);
