import httpClient from "@/services/httpClient";

const ASYNC_DETAIL = "En proceso. Puedes continuar mientras se procesa.";

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

export async function waitForBulkJob(id, { isCurrent = () => true, intervalMs = 2000 } = {}) {
  while (isCurrent()) {
    await sleep(intervalMs);
    if (!isCurrent()) return null;
    const current = await getBulkJob(id);
    if (!isBulkJobOpen(current)) return current;
  }
  return null;
}

/**
 * Tras un bulk: si quedó en cola, suelta la UI ya; al terminar avisa en la vista.
 * Devuelve { async: boolean } para que el caller limpie selección / cierre modal.
 */
export function followBulkJob(result, { showAlert, onFinished } = {}) {
  if (!isBulkJobOpen(result) || !result?.id) {
    const failed = result?.success === false || result?.status === "failed";
    showAlert?.(
      failed ? "danger" : "success",
      result?.message || result?.detail || (failed ? "No se pudo completar la operación." : "Listo."),
    );
    onFinished?.(result);
    return { async: false };
  }

  showAlert?.("success", result.detail || result.message || ASYNC_DETAIL);
  void waitForBulkJob(result.id)
    .then((finalJob) => {
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
      showAlert?.("danger", "No se pudo completar la operación.");
    });

  return { async: true };
}
