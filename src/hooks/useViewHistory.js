"use client";

import { useEffect, useState } from "react";
import {
  clearOpenHistoryParams,
  readOpenHistoryParams,
} from "@/lib/openHistory";

/** Abre el historial macro de la vista desde estado o ?openHistory=1. */
export function useViewHistory(searchParams, setSearchParams) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyType, setHistoryType] = useState("");
  const [historyBatch, setHistoryBatch] = useState(null);

  useEffect(() => {
    const { open, historyType: type, historyBatch: batch } =
      readOpenHistoryParams(searchParams);
    if (!open) return;
    setHistoryOpen(true);
    setHistoryType(type || "");
    setHistoryBatch(batch);
    clearOpenHistoryParams(searchParams, setSearchParams);
  }, [searchParams, setSearchParams]);

  return {
    historyOpen,
    setHistoryOpen,
    historyType,
    historyBatch,
    openHistory: () => setHistoryOpen(true),
    closeHistory: () => {
      setHistoryOpen(false);
      setHistoryBatch(null);
    },
  };
}
