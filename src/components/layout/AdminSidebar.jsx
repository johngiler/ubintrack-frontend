"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Warehouse } from "lucide-react";

import { cn } from "@/lib/cn";
import { getDefaultHomeRoute } from "@/lib/wmsRouteAccess";
import { canSeeNavItem, WMS_NAV_GROUPS } from "@/lib/wmsNavConfig";
import { getWorkspaceLogoUrl, isSidebarLogoGradientEnabled } from "@/lib/workspaceMedia";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useTheme } from "@/context/ThemeContext";

export function AdminSidebar({ mobileOpen, setMobileOpen, user, collapsed }) {
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const { isDark } = useTheme();
  const logoUrl = getWorkspaceLogoUrl(workspace);
  const homeHref = getDefaultHomeRoute(user);
  const logoGradient = isSidebarLogoGradientEnabled(workspace, isDark);

  const sidebarContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] transition-colors duration-300",
          isCollapsed ? "w-[4.75rem]" : "w-64",
        )}
      >
        <Link
          href={homeHref}
          onClick={() => isMobile && setMobileOpen?.(false)}
          aria-label="Inicio"
          title="Inicio"
          style={logoGradient ? { background: "var(--brand-gradient)" } : undefined}
          className={cn(
            "flex w-full shrink-0 flex-col items-center border-b border-[var(--border-subtle)] px-4 py-7 transition-opacity hover:opacity-90",
            isCollapsed ? "px-2 py-5" : "px-5",
            logoGradient && "sidebar-logo-gradient",
          )}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className={cn(
                "object-contain",
                isCollapsed ? "h-12 w-12" : "h-24 w-auto max-w-[220px]",
              )}
            />
          ) : (
            <div
              className={cn(
                "brand-icon-box flex items-center justify-center rounded-2xl",
                isCollapsed ? "h-12 w-12" : "h-24 w-24",
              )}
            >
              <Warehouse className={isCollapsed ? "h-6 w-6" : "h-11 w-11"} strokeWidth={1.75} />
            </div>
          )}
        </Link>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {WMS_NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) => canSeeNavItem(item, user));
            if (!items.length) return null;

            return (
              <div key={group.label} className="mb-5">
                {!isCollapsed ? (
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--foreground-muted)]">
                    {group.label}
                  </p>
                ) : (
                  <div className="mb-2 h-px bg-[var(--border-subtle)]" aria-hidden />
                )}
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname.startsWith(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => isMobile && setMobileOpen?.(false)}
                          title={isCollapsed ? item.label : undefined}
                          className={cn(
                            "nav-link-brand group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                            active
                              ? "brand-nav-active"
                              : "font-normal text-[var(--sidebar-text)]",
                            isCollapsed && "justify-center px-2",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-[18px] w-[18px] shrink-0 transition-colors",
                              !active && "text-[var(--sidebar-text)]",
                            )}
                            strokeWidth={active ? 2.25 : 2}
                          />
                          {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    );
  };

  return (
    <>
      <aside className="hidden h-screen shrink-0 lg:sticky lg:top-0 lg:flex">{sidebarContent()}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-slate-900/40 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="relative z-10 h-full shadow-2xl animate-slide-up">{sidebarContent(true)}</aside>
        </div>
      ) : null}
    </>
  );
}
