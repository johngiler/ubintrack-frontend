"use client";

import { useCallback, useMemo } from "react";
import useSWRInfinite from "swr/infinite";

import { swrInfiniteDefaults } from "@/lib/swr/infiniteDefaults";
import { swrKeys } from "@/lib/swr/keys";
import { fetchNotifications } from "@/services/notificationService";

export const NOTIFICATION_PAGE_SIZE = 12;

export function useNotificationsInfinite(enabled = true) {
  const getKey = useCallback(
    (pageIndex, previousPageData) => {
      if (!enabled) return null;
      if (previousPageData) {
        if (!previousPageData.next) return null;
        if (!previousPageData.results?.length) return null;
      }
      return [...swrKeys.notificationsInfinite(NOTIFICATION_PAGE_SIZE), pageIndex + 1];
    },
    [enabled],
  );

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite(
      getKey,
      (key) => {
        const page = key[key.length - 1];
        return fetchNotifications({ page, pageSize: NOTIFICATION_PAGE_SIZE });
      },
      { ...swrInfiniteDefaults, revalidateOnFocus: true, refreshInterval: 60_000 },
    );

  const items = useMemo(
    () => (data ? data.flatMap((page) => page.results || []) : []),
    [data],
  );
  const totalCount = data?.[0]?.count ?? 0;
  const hasMore = items.length < totalCount;
  const loadingMore = isValidating && size > 1 && hasMore;

  const loadMore = useCallback(() => {
    if (!enabled || loadingMore || !hasMore || isLoading) return;
    void setSize(size + 1);
  }, [enabled, loadingMore, hasMore, isLoading, setSize, size]);

  const refresh = useCallback(async () => {
    await setSize(1);
    await mutate();
  }, [mutate, setSize]);

  return {
    items,
    totalCount,
    loadedCount: items.length,
    hasMore,
    loading: isLoading && items.length === 0,
    loadingMore,
    error,
    loadMore,
    refresh,
    mutate,
    setSize,
  };
}
