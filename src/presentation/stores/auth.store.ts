import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  studentId?: string | null;
  advisorId?: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _isChecking: boolean; // Internal flag to prevent multiple simultaneous checks
  _lastCheckError: number | null; // Timestamp of last failed check
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isLoading: true,
        isAuthenticated: false,
        _isChecking: false,
        _lastCheckError: null,

        checkAuth: async () => {
          // Don't check if already checking
          if (get()._isChecking) {
            return;
          }

          // Don't check if we already have a user (from persist)
          if (get().user) {
            return;
          }

          // Don't retry too soon after a failed check (wait at least 5 seconds)
          const lastError = get()._lastCheckError;
          if (lastError && Date.now() - lastError < 5000) {
            return;
          }

          try {
            set({ isLoading: true, _isChecking: true });
            const response = await fetch("/api/auth/me", {
              credentials: "include", // Ensure cookies are sent
            });

            if (response.ok) {
              const userData = await response.json();
              set({
                user: userData,
                isAuthenticated: true,
                isLoading: false,
                _isChecking: false,
                _lastCheckError: null, // Clear error on success
              });
            } else if (response.status === 401) {
              // Only clear auth state on 401 Unauthorized
              const errorData = await response.json().catch(() => ({}));
              console.warn("Auth check failed (401 Unauthorized):", errorData);

              // Clear persisted state
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                _isChecking: false,
                _lastCheckError: Date.now(), // Record error timestamp
              });

              // Clear localStorage for auth
              if (typeof window !== "undefined") {
                localStorage.removeItem("auth-storage");
              }
            } else {
              // For other errors (500, 404, etc.), don't clear auth state
              // Just log and reset checking flag
              const errorData = await response.json().catch(() => ({}));
              console.error(
                "Auth check failed (non-401):",
                response.status,
                errorData
              );

              set({
                isLoading: false,
                _isChecking: false,
                _lastCheckError: Date.now(),
              });
            }
          } catch (error) {
            console.error("Auth check network error:", error);
            // For network errors, don't clear auth state
            // Just reset loading and checking flags
            set({
              isLoading: false,
              _isChecking: false,
              _lastCheckError: Date.now(), // Record error timestamp
            });
          }
        },

        login: async (email: string, password: string) => {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Login failed");
          }

          const data = await response.json();
          set({
            user: data.user,
            isAuthenticated: true,
          });
          return data;
        },

        logout: async () => {
          try {
            await fetch("/api/auth/logout", {
              method: "POST",
              credentials: "include",
            });
          } catch (error) {
            console.error("Logout error:", error);
          } finally {
            // Always clear state even if API call fails
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              _isChecking: false,
            });

            // Clear localStorage
            if (typeof window !== "undefined") {
              localStorage.removeItem("auth-storage");
            }
          }
        },

        setUser: (user: User | null) => {
          set({
            user,
            isAuthenticated: !!user,
          });
        },
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          // After rehydration, set loading to false and reset checking flag
          if (state) {
            state.isLoading = false;
            state._isChecking = false;
            state._lastCheckError = null;
            if (!state.user) {
              state.isAuthenticated = false;
            }
          }
        },
      }
    ),
    { name: "AuthStore" }
  )
);

// Handle rehydration completion
if (typeof window !== "undefined") {
  useAuthStore.persist.onFinishHydration(() => {
    const state = useAuthStore.getState();
    // Ensure loading and checking flags are reset after rehydration
    useAuthStore.setState({
      isLoading: false,
      _isChecking: false,
      _lastCheckError: null,
      isAuthenticated: !!state.user,
    });
  });
}
