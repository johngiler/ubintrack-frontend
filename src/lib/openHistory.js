/**
 * Lee query de campanita / deep-link al historial macro de la vista.
 */
export function readOpenHistoryParams(searchParams) {
  const open = searchParams?.get?.("openHistory") === "1";
  const historyType = searchParams?.get?.("historyType") || "";
  const rawBatch = searchParams?.get?.("historyBatch");
  const historyBatch = rawBatch && /^\d+$/.test(rawBatch) ? Number(rawBatch) : null;
  return { open, historyType, historyBatch };
}

export function clearOpenHistoryParams(searchParams, setSearchParams) {
  if (!searchParams) return;
  const next = new URLSearchParams(searchParams.toString());
  let changed = false;
  ["openHistory", "historyType", "historyBatch"].forEach((key) => {
    if (next.has(key)) {
      next.delete(key);
      changed = true;
    }
  });
  if (changed) setSearchParams(next, { replace: true });
}
