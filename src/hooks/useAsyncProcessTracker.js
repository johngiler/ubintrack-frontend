"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  listAsyncJobs,
  parseCavaGenerationJobId,
  removeAsyncJob,
  upsertAsyncJob,
} from "@/lib/asyncProcessStore";
import {
  ASYNC_DETAIL,
  getBulkJob,
  isBulkJobOpen,
  waitForBulkJob,
} from "@/lib/bulkJobs";
import { getCavaGeneration } from "@/services/storageService";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generationIsOpen(status) {
  return status === "pending" || status === "running";
}

async function waitForCavaGeneration(cavaId, { isCurrent = () => true, intervalMs = 2000 } = {}) {
  while (isCurrent()) {
    await sleep(intervalMs);
    if (!isCurrent()) return null;
    const current = await getCavaGeneration(cavaId);
    if (!generationIsOpen(current?.status)) return current;
  }
  return null;
}

/**
 * Rastrea trabajos async de una sección.
 * Persiste en sessionStorage para sobrevivir refresh y cambio de vista.
 */
export function useAsyncProcessTracker(scope, { onSettled } = {}) {
  const [jobs, setJobs] = useState(() => listAsyncJobs(scope));
  const watchingRef = useRef(new Set());
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const start = useCallback(
    (job) => {
      if (!job?.id) return;
      const next = {
        id: job.id,
        scope,
        message: job.message || ASYNC_DETAIL,
        kind: job.kind || "",
        meta: job.meta || {},
        startedAt: Date.now(),
      };
      upsertAsyncJob(next);
      setJobs((prev) => {
        const without = prev.filter((item) => String(item.id) !== String(next.id));
        return [...without, next];
      });
    },
    [scope],
  );

  const finish = useCallback((id) => {
    if (id == null) return;
    removeAsyncJob(id);
    watchingRef.current.delete(String(id));
    setJobs((prev) => prev.filter((item) => String(item.id) !== String(id)));
  }, []);

  const clear = useCallback(() => {
    setJobs((prev) => {
      for (const job of prev) {
        removeAsyncJob(job.id);
        watchingRef.current.delete(String(job.id));
      }
      return [];
    });
  }, []);

  const watchJob = useCallback(
    (job) => {
      const key = String(job.id);
      if (watchingRef.current.has(key)) return;
      watchingRef.current.add(key);

      const isCurrent = () => watchingRef.current.has(key);

      const settle = (finalJob, failedFallback = false) => {
        if (!watchingRef.current.has(key)) return;
        finish(job.id);
        const failed =
          failedFallback ||
          finalJob?.status === "failed" ||
          finalJob?.success === false;
        onSettledRef.current?.({
          job,
          finalJob,
          failed,
          message:
            finalJob?.message ||
            finalJob?.detail ||
            (failed ? "No se pudo completar la operación." : "Listo."),
        });
      };

      const cavaId =
        job.meta?.cavaId ??
        parseCavaGenerationJobId(job.id) ??
        (job.kind === "cava_generation" ? Number(job.meta?.cava_id) : null);

      if (cavaId || job.kind === "cava_generation" || key.startsWith("cava-generation-")) {
        if (!cavaId) {
          finish(job.id);
          return;
        }
        void waitForCavaGeneration(cavaId, { isCurrent })
          .then((finalJob) => {
            if (!finalJob) {
              // Vista desmontada / cancelado: el job sigue en storage.
              watchingRef.current.delete(key);
              return;
            }
            settle(finalJob);
          })
          .catch(() => settle(null, true));
        return;
      }

      void (async () => {
        try {
          // Si ya terminó mientras no estábamos en la vista, no esperar.
          const current = await getBulkJob(job.id);
          if (!isBulkJobOpen(current)) {
            settle(current);
            return;
          }
          const finalJob = await waitForBulkJob(job.id, { isCurrent });
          if (!finalJob) {
            watchingRef.current.delete(key);
            return;
          }
          settle(finalJob);
        } catch {
          settle(null, true);
        }
      })();
    },
    [finish],
  );

  // Restaurar + retomar al montar / cuando cambie el scope.
  useEffect(() => {
    const restored = listAsyncJobs(scope);
    setJobs(restored);
    for (const job of restored) {
      watchJob(job);
    }
    return () => {
      // Al salir de la vista: dejar de observar aquí; el storage conserva el job.
      watchingRef.current.clear();
    };
  }, [scope, watchJob]);

  // Nuevos jobs iniciados en esta sesión también se observan (por si followBulkJob
  // se cancela al desmontar antes; el watcher del tracker es la fuente estable).
  useEffect(() => {
    for (const job of jobs) {
      watchJob(job);
    }
  }, [jobs, watchJob]);

  const hasKind = useCallback(
    (kind) => {
      if (!kind) return false;
      return jobs.some((job) => job.kind === kind);
    },
    [jobs],
  );

  return {
    jobs,
    start,
    finish,
    clear,
    hasKind,
    isBusy: jobs.length > 0,
  };
}
