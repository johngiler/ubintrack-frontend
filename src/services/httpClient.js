"use client";

import axios from "axios";
import { clientTenantSlug, workspaceSlugRequestHeaders } from "@/lib/tenant";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : "");

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

export const hasPerm = (user, codename) => {
  if (!user) return false;
  if (user.is_superuser || user.is_workspace_admin) return true;
  const perms = user.permissions || [];
  return perms.some((p) => {
    const key = typeof p === "string" ? p : p?.key;
    return key === codename;
  });
};

export const canCRUD = (user, appLabel, model) => ({
  add: hasPerm(user, `${appLabel}.add_${model}`),
  change: hasPerm(user, `${appLabel}.change_${model}`),
  delete: hasPerm(user, `${appLabel}.delete_${model}`),
  view: hasPerm(user, `${appLabel}.view_${model}`),
});

export { clientTenantSlug };
