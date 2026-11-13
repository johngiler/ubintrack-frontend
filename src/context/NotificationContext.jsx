"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";

import { useAppUpdateOptional } from "@/context/AppUpdateContext";
import { useAuth } from "@/context/AuthContext";
import { useNotificationsInfinite } from "@/hooks/useNotificationsInfinite";
import { usePresenceActivity } from "@/hooks/usePresenceActivity";
import { swrKeys } from "@/lib/swr";
import { wsNotificationsUrl } from "@/lib/wsUrl";
import { emitBulkJob, emitCavaGeneration } from "@/lib/bulkJobEvents";
import {
  fetchNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notificationService";

const NotificationContext = createContext(null);

function mergeLive(base, live) {
  const seen = new Set();
  const out = [];
  for (const item of [...live, ...(base || [])]) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function patchNotificationPages(pages, mapper) {
  if (!pages) return pages;
  return pages.map((page) => ({
    ...page,
    results: (page.results || []).map(mapper),
  }));
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const appUpdate = useAppUpdateOptional();
  const notifyRemoteBuild = appUpdate?.notifyRemoteBuild;
  const canSee = Boolean(user) && !user?.client;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const [liveItems, setLiveItems] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const sendPresenceStatus = useCallback((status) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "presence_status", status }));
  }, []);

  usePresenceActivity(canSee && Boolean(token), sendPresenceStatus);

  const {
    items: baseResults,
    totalCount,
    loadedCount,
    hasMore,
    loading,
    loadingMore,
    loadMore,
    refresh: refreshList,
    mutate: mutateList,
    setSize,
  } = useNotificationsInfinite(canSee);

  const { data: unreadCount = 0, mutate: mutateUnread } = useSWR(
    canSee ? swrKeys.notificationsUnread : null,
    fetchNotificationUnreadCount,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  const notifications = useMemo(
    () => mergeLive(baseResults, liveItems),
    [baseResults, liveItems],
  );

  const refresh = useCallback(() => {
    void refreshList();
    void mutateUnread();
  }, [refreshList, mutateUnread]);

  useEffect(() => {
    if (!canSee || !token) {
      setLiveItems([]);
      setOnlineUsers([]);
      void setSize(1);
      return undefined;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const socket = new WebSocket(wsNotificationsUrl(token));
        wsRef.current = socket;

        socket.onopen = () => {
          socket.send(JSON.stringify({ type: "presence_status", status: "active" }));
        };

        socket.onmessage = (event) => {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }
          if (data?.type === "app_update") {
            const buildId = data.payload?.build_id;
            if (typeof buildId === "string" && buildId.trim()) {
              notifyRemoteBuild?.(buildId);
            }
            return;
          }
          if (data?.type === "bulk_job" && data.payload) {
            emitBulkJob(data.payload);
            return;
          }
          if (data?.type === "cava_generation" && data.payload) {
            emitCavaGeneration(data.payload);
            return;
          }
          if (data?.type === "presence" && Array.isArray(data.payload?.users)) {
            setOnlineUsers(data.payload.users);
            return;
          }
          if (data?.type !== "notification" || !data.payload) return;
          const payload = data.payload;
          setLiveItems((prev) => {
            if (prev.some((n) => n.id === payload.id)) return prev;
            return [payload, ...prev].slice(0, 50);
          });
          mutateUnread(
            (c) => (typeof c === "number" ? c + 1 : 1),
            { revalidate: false },
          );
        };

        socket.onclose = () => {
          wsRef.current = null;
          if (!cancelled) {
            reconnectTimer.current = setTimeout(connect, 4000);
          }
        };

        socket.onerror = () => {
          try {
            socket.close();
          } catch {
            /* ignore */
          }
        };
      } catch {
        if (!cancelled) {
          reconnectTimer.current = setTimeout(connect, 4000);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    };
  }, [canSee, token, mutateUnread, setSize, notifyRemoteBuild]);

  const markRead = useCallback(
    async (id) => {
      const updated = await markNotificationRead(id);
      setLiveItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updated, is_read: true } : n)),
      );
      void mutateList(
        (pages) =>
          patchNotificationPages(pages, (item) =>
            item.id === id ? { ...item, ...updated, is_read: true } : item,
          ),
        { revalidate: false },
      );
      await mutateUnread();
    },
    [mutateList, mutateUnread],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setLiveItems((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: n.read_at || new Date().toISOString(),
      })),
    );
    void mutateList(
      (pages) =>
        patchNotificationPages(pages, (item) => ({
          ...item,
          is_read: true,
          read_at: item.read_at || new Date().toISOString(),
        })),
      { revalidate: false },
    );
    void mutateUnread(0, { revalidate: false });
  }, [mutateList, mutateUnread]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: canSee ? unreadCount : 0,
      loading: canSee && loading,
      loadingMore,
      hasMore,
      loadedCount: Math.max(loadedCount, notifications.length),
      totalCount: Math.max(totalCount, notifications.length),
      loadMore,
      markRead,
      markAllRead,
      refresh,
      canSee,
      onlineUsers,
    }),
    [
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
      refresh,
      canSee,
      onlineUsers,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications debe usarse dentro de NotificationProvider");
  }
  return ctx;
}
