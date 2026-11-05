"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Building2, LogOut, User } from "lucide-react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SidebarToggle } from "@/components/layout/SidebarToggle";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";

import { cn } from "@/lib/cn";
import {
  getHeaderOrgName,
  getPermissionsBadge,
  getUserRoleLabel,
  isWorkspaceAdministrator,
} from "@/lib/wmsUserDisplay";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";

export function AdminHeader({ onMenuClick, sidebarCollapsed = false }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { displayName } = useWorkspace();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const onDocClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const orgName = getHeaderOrgName(user, displayName);
  const roleLabel = getUserRoleLabel(user);
  const permissionsBadge = getPermissionsBadge(user);

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-height)] items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--header-bg)] px-4 transition-colors duration-300 lg:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarToggle collapsed={sidebarCollapsed} onClick={onMenuClick} />

        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]">
              {orgName}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-xs capitalize text-[var(--foreground-muted)]">{roleLabel}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand [background:var(--brand-surface)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand-primary)_12%,transparent)]">
                {permissionsBadge}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 sm:flex">
          <ThemeToggle />
          {!user?.client ? <NotificationDropdown /> : null}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            className="flex cursor-pointer items-center gap-2 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-[var(--surface-hover)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <User className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="hidden min-w-0 text-left md:block">
              <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                {user?.full_name || user?.email}
              </span>
              <span className="block truncate text-xs text-[var(--foreground-muted)]">{user?.email}</span>
            </span>
          </button>

          {profileOpen ? (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
              <Link
                href="/account/profile"
                onClick={() => setProfileOpen(false)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-hover)]",
                  pathname === "/account/profile"
                    ? "bg-sky-50 font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400"
                    : "text-[var(--foreground)]",
                )}
              >
                <User className="h-4 w-4 text-sky-600" strokeWidth={2} />
                Mi cuenta
              </Link>
              {isWorkspaceAdministrator(user) ? (
                <Link
                  href="/core/owner"
                  onClick={() => setProfileOpen(false)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-hover)]",
                    pathname === "/core/owner"
                      ? "bg-sky-50 font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-400"
                      : "text-[var(--foreground)]",
                  )}
                >
                  <Building2 className="h-4 w-4 text-violet-600" strokeWidth={2} />
                  Configuración del propietario
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  signOut();
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <LogOut className="h-4 w-4 text-amber-500" strokeWidth={2} />
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
