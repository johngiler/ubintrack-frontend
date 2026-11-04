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

import { useAuth } from "@/context/AuthContext";
import { wsNotificationsUrl } from "@/lib/wsUrl";
import {
  fetchNotificationUnreadCount,
  fetchNotifications,
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

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const canSee = Boolean(user) && !user?.client;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const [liveItems, setLiveItems] = useState([]);

  const { data: listData, mutate: mutateList, isLoading } = useSWR(
    canSee ? "notifications-list" : null,
    () => fetchNotifications({ page: 1 }),
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  const { data: unreadCount = 0, mutate: mutateUnread } = useSWR(
    canSee ? "notifications-unread" : null,
    fetchNotificationUnreadCount,
    { refreshInterval: 60_000, revalidateOnFocus: true },
  );

  const baseResults = listData?.results || [];
  const notifications = useMemo(
    () => mergeLive(baseResults, liveItems),
    [baseResults, liveItems],
  );

  const refresh = useCallback(() => {
    mutateList();
    mutateUnread();
  }, [mutateList, mutateUnread]);

  useEffect(() => {
    if (!canSee || !token) {
      setLiveItems([]);
      return undefined;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      try {
        const socket = new WebSocket(wsNotificationsUrl(token));
        wsRef.current = socket;

        socket.onmessage = (event) => {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch {
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
  }, [canSee, token, mutateUnread]);

  const markRead = useCallback(
    async (id) => {
      const updated = await markNotificationRead(id);
      setLiveItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updated, is_read: true } : n)),
      );
      await mutateList();
      await mutateUnread();
    },
    [mutateList, mutateUnread],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setLiveItems((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at || new Date().toISOString() })),
    );
    await mutateList();
    await mutateUnread();
  }, [mutateList, mutateUnread]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: canSee ? unreadCount : 0,
      loading: canSee && isLoading,
      markRead,
      markAllRead,
      refresh,
      canSee,
    }),
    [
      notifications,
      unreadCount,
      isLoading,
      markRead,
      markAllRead,
      refresh,
      canSee,
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
