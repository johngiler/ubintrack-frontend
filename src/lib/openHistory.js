/**
 * Lee query de campanita / deep-link al historial macro de la vista.
 */
export function readOpenHistoryParams(searchParams) {
  const open = searchParams?.get?.("openHistory") === "1";
  const historyType = searchParams?.get?.("historyType") || "";
  const historyActor = searchParams?.get?.("historyActor") || "";
  const rawBatch = searchParams?.get?.("historyBatch");
  const historyBatch = rawBatch && /^\d+$/.test(rawBatch) ? Number(rawBatch) : null;
  return { open, historyType, historyActor, historyBatch };
}

const HISTORY_QUERY_KEYS = [
  "openHistory",
  "historyType",
  "historyActor",
  "historyBatch",
];

export function clearOpenHistoryParams(searchParams, setSearchParams) {
  if (!searchParams) return;
  const next = new URLSearchParams(searchParams.toString());
  let changed = false;
  HISTORY_QUERY_KEYS.forEach((key) => {
    if (next.has(key)) {
      next.delete(key);
      changed = true;
    }
  });
  if (changed) setSearchParams(next, { replace: true });
}
