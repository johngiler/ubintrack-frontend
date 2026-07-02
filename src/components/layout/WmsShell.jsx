"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import WmsAccessDenied from "@/components/layout/WmsAccessDenied";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { canAccessRoute } from "@/lib/wmsRouteAccess";

const SIDEBAR_KEY = "ubintrack-sidebar-collapsed";

export function WmsShell({ children }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { workspaceStatus } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isAuthRoute = pathname === "/login" || pathname === "/";

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleMenuClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileOpen(true);
      return;
    }
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-sky-600 border-t-transparent" />
        <p className="text-sm text-slate-500">Cargando panel…</p>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") window.location.replace("/login");
    return null;
  }

  if (workspaceStatus === "missing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-xl font-bold text-slate-900">Workspace no encontrado</h1>
          <p className="mt-2 text-sm text-slate-600">Verifica el subdominio o contacta al administrador.</p>
        </div>
      </div>
    );
  }

  const routeAllowed = canAccessRoute(pathname, user);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <AdminSidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        user={user}
        collapsed={sidebarCollapsed}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader onMenuClick={handleMenuClick} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--background)] p-4 lg:p-6">
          {routeAllowed ? children : <WmsAccessDenied pathname={pathname} user={user} />}
        </main>
      </div>
    </div>
  );
}
