/** Bus liviano: WS `bulk_job` / `cava_generation` → tracker async. */

const bulkListeners = new Set();
const cavaListeners = new Set();

export function subscribeBulkJob(listener) {
  if (typeof listener !== "function") return () => {};
  bulkListeners.add(listener);
  return () => {
    bulkListeners.delete(listener);
  };
}

export function emitBulkJob(payload) {
  if (!payload || payload.id == null) return;
  for (const listener of [...bulkListeners]) {
    try {
      listener(payload);
    } catch {
      /* ignore */
    }
  }
}

export function subscribeCavaGeneration(listener) {
  if (typeof listener !== "function") return () => {};
  cavaListeners.add(listener);
  return () => {
    cavaListeners.delete(listener);
  };
}

export function emitCavaGeneration(payload) {
  if (!payload) return;
  for (const listener of [...cavaListeners]) {
    try {
      listener(payload);
    } catch {
      /* ignore */
    }
  }
}
