"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { login, logout as authLogout } from "@/services/authService";
import { getMyProfile } from "@/services/coreService";
import { getDefaultHomeRoute } from "@/lib/wmsRouteAccess";
import { clearSwrCache, invalidateAllSwrCache } from "@/lib/swr";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await getMyProfile();
      setUser(data);
      return data;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem("token");
        setUser(null);
        void clearSwrCache();
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = useCallback(
    async (credentials) => {
      const data = await login(credentials);
      localStorage.setItem("token", data.token);
      const fullUser = await getMyProfile().catch(() => data.user);
      const u = fullUser || data.user;
      setUser(u);
      setLoading(false);
      router.replace(getDefaultHomeRoute(u));
      void clearSwrCache();
      void invalidateAllSwrCache();
      return data;
    },
    [router],
  );

  const signOut = useCallback(async () => {
    await authLogout();
    setUser(null);
    setLoading(false);
    void clearSwrCache();
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, refreshUser }),
    [user, loading, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
