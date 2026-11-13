import { subscribeBulkJob } from "@/lib/bulkJobEvents";
import httpClient from "@/services/httpClient";

export const ASYNC_DETAIL = "En proceso. Puedes continuar mientras se procesa.";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isBulkJobOpen(result) {
  if (!result) return false;
  if (result.async) return true;
  return result.status === "pending" || result.status === "running";
}

export async function getBulkJob(id) {
  const response = await httpClient.get(`/api/bulk-jobs/${id}/`);
  return response.data;
}

/**
 * Espera cierre del job: evento WS `bulk_job` primero;
 * fallback HTTP cada intervalMs por si se pierde el mensaje.
 */
export async function waitForBulkJob(
  id,
  { isCurrent = () => true, intervalMs = 15000 } = {},
) {
  return new Promise((resolve) => {
    let settled = false;
    let unsub = () => {};

    const finish = (value) => {
      if (settled) return;
      settled = true;
      unsub();
      resolve(value);
    };

    unsub = subscribeBulkJob((payload) => {
      if (!isCurrent()) {
        finish(null);
        return;
      }
      if (String(payload.id) !== String(id)) return;
      if (isBulkJobOpen(payload)) return;
      finish(payload);
    });

    void (async () => {
      while (!settled && isCurrent()) {
        await sleep(intervalMs);
        if (settled || !isCurrent()) break;
        try {
          const current = await getBulkJob(id);
          if (!isBulkJobOpen(current)) {
            finish(current);
            return;
          }
        } catch {
          /* reintento en el siguiente intervalo */
        }
      }
      if (!settled) finish(null);
    })();
  });
}

/**
 * Tras un bulk: si quedó en cola, suelta la UI ya.
 * Con onAsyncStart (tracker de sección), el seguimiento y el aviso final
 * los hace el tracker (persiste al cambiar de vista / refresh).
 */
export function followBulkJob(
  result,
  { showAlert, onFinished, onAsyncStart, onAsyncEnd } = {},
) {
  if (!isBulkJobOpen(result) || !result?.id) {
    const failed = result?.success === false || result?.status === "failed";
    showAlert?.(
      failed ? "danger" : "success",
      result?.message || result?.detail || (failed ? "No se pudo completar la operación." : "Listo."),
    );
    onFinished?.(result);
    return { async: false };
  }

  const message = result.detail || result.message || ASYNC_DETAIL;
  onAsyncStart?.({
    id: result.id,
    message,
    kind: result.kind,
  });

  // Tracker de la sección observa (y reanuda tras refresh / cambio de vista).
  if (onAsyncStart) {
    return { async: true };
  }

  void waitForBulkJob(result.id)
    .then((finalJob) => {
      onAsyncEnd?.(result.id);
      if (!finalJob) return;
      const failed = finalJob.status === "failed" || finalJob.success === false;
      showAlert?.(
        failed ? "danger" : "success",
        finalJob.message ||
          finalJob.detail ||
          (failed ? "No se pudo completar la operación." : "Listo."),
      );
      onFinished?.(finalJob);
    })
    .catch(() => {
      onAsyncEnd?.(result.id);
      showAlert?.("danger", "No se pudo completar la operación.");
    });

  return { async: true };
}
