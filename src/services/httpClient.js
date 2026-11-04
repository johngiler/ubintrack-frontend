"use client";

import axios from "axios";
import { hasUserPermission } from "@/lib/userPermissions";
import { clientTenantSlug, workspaceSlugRequestHeaders } from "@/lib/tenant";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8001" : "");

const httpClient = axios.create({ baseURL });

httpClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
      Object.assign(config.headers, workspaceSlugRequestHeaders(window.location.hostname));
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default httpClient;

/** Mensaje legible desde respuesta de error del API (axios). */
export function getApiErrorMessage(error, fallback = "Error inesperado") {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
    if (typeof data.detail === "string" && data.detail.trim()) return data.detail.trim();
    if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
  }
  if (error?.message && !/^Request failed with status code \d+$/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}

export const hasPerm = (user, codename) => hasUserPermission(user, codename);

export const canCRUD = (user, appLabel, model) => ({
  add: hasPerm(user, `${appLabel}.add_${model}`),
  change: hasPerm(user, `${appLabel}.change_${model}`),
  delete: hasPerm(user, `${appLabel}.delete_${model}`),
  view: hasPerm(user, `${appLabel}.view_${model}`),
});

export { clientTenantSlug };
