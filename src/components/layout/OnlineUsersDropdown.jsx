"use client";

import { useEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { useNotifications } from "@/context/NotificationContext";
import { presenceStatus } from "@/lib/presence";

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() || "").join("");
  return letters || "?";
}

function OnlineUserRow({ user }) {
  const name = user.display_name || user.username;
  const active = presenceStatus(user) === "active";
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 last:border-b-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
        <p className="truncate text-xs text-[var(--foreground-muted)]">
          {user.role_label || "Usuario"}
          <span>{" · "}{active ? "Activo" : "Inactivo"}</span>
        </p>
      </div>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-emerald-500" : "bg-amber-400"}`}
        title={active ? "Activo" : "Inactivo"}
        aria-label={active ? "Activo" : "Inactivo"}
      />
    </div>
  );
}

export function OnlineUsersDropdown() {
  const { onlineUsers, canSee } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!canSee) return null;

  const count = onlineUsers.length;
  const activeCount = onlineUsers.filter((user) => presenceStatus(user) === "active").length;
  const badge = count > 0 ? (count > 9 ? "9+" : String(count)) : null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Usuarios en línea"
        aria-expanded={open}
        title="Usuarios en línea"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--surface)] text-[var(--foreground-muted)] shadow-sm ring-1 ring-[var(--border)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <Users className="h-4 w-4" strokeWidth={2} />
        {badge ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
            {badge}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
          >
            <div className="border-b border-[var(--border)] px-4 py-2.5">
              <p className="text-sm font-semibold text-[var(--foreground)]">Usuarios en línea</p>
              <p className="mt-0.5 text-xs text-[var(--foreground-muted)]">
                {count === 0
                  ? "Nadie conectado"
                  : `${count} conectado${count === 1 ? "" : "s"} · ${activeCount} activo${activeCount === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {count === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                  <Users className="h-8 w-8 text-[var(--foreground-muted)]" strokeWidth={1.25} aria-hidden />
                  <p className="text-sm text-[var(--foreground-muted)]">Sin usuarios en línea</p>
                </div>
              ) : (
                onlineUsers.map((user) => <OnlineUserRow key={user.id} user={user} />)
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
