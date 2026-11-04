"use client";

import useSWR from "swr";

import { swrKeys } from "@/lib/swr";
import { getNavCounts } from "@/services/navService";

export function useNavCounts() {
  const { data, error, isLoading, mutate } = useSWR(swrKeys.navCounts, getNavCounts, {
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
    refreshInterval: 120_000,
  });

  return {
    counts: data ?? {},
    loading: isLoading && !data,
    error,
    refresh: mutate,
  };
}
