"use client";

const STORAGE_KEY = "ubintrack.asyncJobs.v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readAll() {
  if (!canUseStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id != null) : [];
  } catch {
    return [];
  }
}

function writeAll(jobs) {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    // quota / private mode
  }
}

export function listAsyncJobs(scope) {
  const all = readAll();
  if (!scope) return all;
  return all.filter((job) => job.scope === scope);
}

export function upsertAsyncJob(job) {
  if (!job?.id) return;
  const all = readAll().filter((item) => String(item.id) !== String(job.id));
  all.push({
    id: job.id,
    scope: job.scope || "",
    message: job.message || "En proceso. Puedes continuar mientras se procesa.",
    kind: job.kind || "",
    meta: job.meta && typeof job.meta === "object" ? job.meta : {},
    startedAt: job.startedAt || Date.now(),
  });
  writeAll(all);
}

export function removeAsyncJob(id) {
  if (id == null) return;
  writeAll(readAll().filter((item) => String(item.id) !== String(id)));
}

export function clearAsyncJobs(scope) {
  if (!scope) {
    writeAll([]);
    return;
  }
  writeAll(readAll().filter((job) => job.scope !== scope));
}

export function parseCavaGenerationJobId(id) {
  const match = String(id || "").match(/^cava-generation-(.+)$/);
  if (!match) return null;
  const raw = match[1];
  if (raw === "pending" || raw === "null" || raw === "undefined") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
