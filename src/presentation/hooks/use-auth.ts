/**
 * Auth Hook - Wrapper for Zustand Auth Store
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/presentation/stores/auth.store";

export type { User } from "@/presentation/stores/auth.store";

export function useAuth() {
  const router = useRouter();
  const {
    user,
    isLoading,
    isAuthenticated,
    checkAuth,
    login: storeLogin,
    logout: storeLogout,
  } = useAuthStore();

  useEffect(() => {
    // Only check auth if no user and not loading
    // The persist middleware will handle initial loading state
    if (!user && !isLoading) {
      checkAuth();
    }
  }, [user, isLoading, checkAuth]);

  // Separate effect to handle redirect on 401 (when auth state is cleared)
  useEffect(() => {
    // Redirect to login only when not authenticated and not loading
    // This will be triggered when auth state is cleared due to 401
    if (!isLoading && !isAuthenticated && !user) {
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        router.push("/login");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  const login = async (email: string, password: string) => {
    const result = await storeLogin(email, password);
    return result;
  };

  const logout = async () => {
    await storeLogout();
    router.push("/login");
  };

  return {
    user,
    isLoading,
    login,
    logout,
    checkAuth,
    isAuthenticated,
  };
}
