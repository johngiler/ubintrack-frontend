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
  const [historyActor, setHistoryActor] = useState("");
  const [historyBatch, setHistoryBatch] = useState(null);

  useEffect(() => {
    const {
      open,
      historyType: type,
      historyActor: actor,
      historyBatch: batch,
    } = readOpenHistoryParams(searchParams);
    if (!open) return;
    setHistoryOpen(true);
    setHistoryType(type || "");
    setHistoryActor(actor || "");
    setHistoryBatch(batch);
    clearOpenHistoryParams(searchParams, setSearchParams);
  }, [searchParams, setSearchParams]);

  return {
    historyOpen,
    setHistoryOpen,
    historyType,
    historyActor,
    historyBatch,
    openHistory: () => {
      setHistoryType("");
      setHistoryActor("");
      setHistoryBatch(null);
      setHistoryOpen(true);
    },
    closeHistory: () => {
      setHistoryOpen(false);
      setHistoryType("");
      setHistoryActor("");
      setHistoryBatch(null);
    },
  };
}
