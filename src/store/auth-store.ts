import { create } from "zustand";
import { persist } from "zustand/middleware";
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
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Dates are stored as ISO strings, no conversion needed on rehydration
        if (state?.user) {
          // Optional: You could perform validation or logging here if needed
        }
      },
    }
  )
);
