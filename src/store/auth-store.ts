import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, LoginCredentials, ProfileData } from "@/types";
import { authenticateUser, type AuthUser } from "@/lib/auth-service";

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
          console.log("🔐 Login attempt:", {
            customerId: credentials.customerId,
          });

          // Authenticate against Sanity database
          const authResult = await authenticateUser(credentials);

          if (!authResult.success || !authResult.user) {
            set({ isLoading: false });
            throw new Error(authResult.error || "Authentication failed");
          }

          // Convert AuthUser to User type
          const user: User = {
            id: authResult.user._id,
            clerkId: authResult.user.clerkId,
            customerId: authResult.user.customerId,
            secretKey: authResult.user.secretKey,
            name: authResult.user.name,
            email: authResult.user.email,
            phone: authResult.user.phone,
            location: authResult.user.location,
            role: authResult.user.role,
            isActive: authResult.user.isActive,
            createdAt: new Date(authResult.user.createdAt),
            updatedAt: new Date(authResult.user.updatedAt),
          };

          console.log("✅ Authentication successful:", {
            userId: user.id,
            role: user.role,
            name: user.name,
          });

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
        set({
          user: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateProfile: async (data: ProfileData) => {
        const { user } = get();
        if (!user) throw new Error("No user logged in");

        set({ isLoading: true });
        try {
          // TODO: Implement profile update with Clerk
          const updatedUser = { ...user, ...data };
          set({ user: updatedUser, isLoading: false });
        } catch (error) {
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
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Convert date strings back to Date objects after rehydration
        if (state?.user) {
          state.user.createdAt = new Date(state.user.createdAt);
          state.user.updatedAt = new Date(state.user.updatedAt);
        }
      },
    }
  )
);
