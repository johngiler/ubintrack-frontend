"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import LoadMoreFooter from "@/components/ui/LoadMoreFooter";
import WmsFeedSkeleton from "@/components/wms/WmsFeedSkeleton";
import { useNotifications } from "@/context/NotificationContext";
import { notificationHref } from "@/lib/wsUrl";
import { cn } from "@/lib/cn";


function formatWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-PA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function NotificationDropdown() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    loadedCount,
    totalCount,
    loadMore,
    markRead,
    markAllRead,
    canSee,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!canSee) return null;

  const onSelect = async (item) => {
    setOpen(false);
    if (!item.is_read) {
      try {
        await markRead(item.id);
      } catch {
        /* ignore */
      }
    }
    router.push(notificationHref(item));
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Notificaciones"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[var(--surface)] text-[var(--foreground-muted)] shadow-sm ring-1 ring-[var(--border)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      >
        <Bell className="h-4 w-4" strokeWidth={2} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
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
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
              <p className="text-sm font-semibold text-[var(--foreground)]">Notificaciones</p>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="cursor-pointer text-xs font-medium text-[var(--brand-primary)] hover:underline"
                >
                  Marcar todas
                </button>
              ) : null}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <WmsFeedSkeleton rows={4} variant="notification" />
              ) : null}
              {!loading && notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--foreground-muted)]">
                  Sin notificaciones
                </p>
              ) : null}
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    "flex w-full cursor-pointer gap-3 border-b border-[var(--border)] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--surface-hover)]",
                    !item.is_read && "bg-[var(--brand-surface)]/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      item.is_read ? "bg-[var(--border)]" : "bg-pink-500",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm leading-snug text-[var(--foreground)]",
                        item.is_read ? "font-medium" : "font-semibold",
                      )}
                    >
                      {item.message}
                    </span>
                    {item.actor_display ? (
                      <span className="mt-0.5 block text-xs text-[var(--foreground-muted)]">
                        {item.actor_display}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-[11px] text-[var(--foreground-muted)]">
                      {formatWhen(item.created_at)}
                    </span>
                  </span>
                </button>
              ))}
              {!loading && notifications.length > 0 ? (
                <LoadMoreFooter
                  hasMore={hasMore}
                  loading={loadingMore}
                  onLoadMore={loadMore}
                  loadedCount={loadedCount}
                  totalCount={totalCount}
                  itemLabel="notificaciones"
                  className="border-t border-[var(--border)] py-3"
                />
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
