import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User, LoginCredentials, ProfileData } from "@/types";

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
          // TODO: Implement Clerk authentication
          // This will be implemented when we set up Clerk integration
          console.log("Login attempt:", credentials);

          // Mock implementation for now
          const mockUser: User = {
            id: "1",
            clerkId: credentials.customerId,
            name: credentials.customerId === "admin" ? "Admin User" : "Customer User",
            phone: "1234567890",
            location: "Test Location",
            role: credentials.customerId === "admin" ? "admin" : "customer",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          console.log("Setting auth state:", {
            user: mockUser,
            role: mockUser.role,
            isAuthenticated: true,
          });

          set({
            user: mockUser,
            role: mockUser.role,
            isAuthenticated: true,
            isLoading: false,
          });

          console.log("Auth state set successfully");
        } catch (error) {
          console.error("Login error:", error);
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
