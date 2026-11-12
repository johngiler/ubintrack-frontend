"use client";

import useSWRInfinite from "swr/infinite";
import { swrInfiniteDefaults } from "@/lib/swr/infiniteDefaults";
import { swrKeys } from "@/lib/swr/keys";
import { fetchActivity } from "@/services/activityService";

const PAGE_SIZE = 20;

export function useActivityInfinite({ open, section, filters }) {
  const enabled = Boolean(open && section);
  const {
    data,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
    mutate,
  } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      if (!enabled) return null;
      if (previousPageData && !previousPageData.next) return null;
      return swrKeys.activityInfinite(section, pageIndex + 1, PAGE_SIZE, filters);
    },
    // key: ["activity", "infinite", section, page, pageSize, filtersJson]
    ([, , , page, pageSize, filterKey]) => {
      const parsed = filterKey ? JSON.parse(filterKey) : {};
      return fetchActivity({
        section,
        page,
        pageSize,
        action: parsed.action || "",
        actor: parsed.actor || "",
        dateFrom: parsed.dateFrom || "",
        dateTo: parsed.dateTo || "",
      });
    },
    swrInfiniteDefaults,
  );

  const pages = data || [];
  const items = pages.flatMap((p) => p.results || []);
  const total = pages[0]?.count ?? 0;
  const hasMore = Boolean(pages.length && pages[pages.length - 1]?.next);

  return {
    items,
    total,
    error,
    isLoading: enabled && isLoading,
    isValidating,
    hasMore,
    loadMore: () => setSize(size + 1),
    mutate,
  };
}
