"use client";

import { createContext, useContext, useMemo } from "react";
import useSWR from "swr";

import { clientTenantSlug, envTenantSlugFallback, workspaceSlugRequestHeaders } from "@/lib/tenant";

const WorkspaceContext = createContext(undefined);

async function fetchWorkspace() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  const headers = workspaceSlugRequestHeaders(
    typeof window !== "undefined" ? window.location.hostname : undefined,
  );
  const res = await fetch(`${base}/api/workspace/current/`, { headers });
  if (res.status === 404) return { workspaceStatus: "missing", workspace: null };
  if (!res.ok) throw new Error("No se pudo cargar el workspace");
  const workspace = await res.json();
  return { workspaceStatus: "ready", workspace };
}

export function WorkspaceProvider({ children }) {
  const slug = typeof window !== "undefined" ? clientTenantSlug() : envTenantSlugFallback();
  const { data, error, isLoading, mutate } = useSWR(`workspace-${slug}`, fetchWorkspace, {
    revalidateOnFocus: false,
  });

  const workspace = data?.workspace ?? null;
  const workspaceStatus = error
    ? "error"
    : data?.workspaceStatus === "missing"
      ? "missing"
      : data?.workspaceStatus === "ready"
        ? "ready"
        : isLoading
          ? "loading"
          : "loading";

  const displayName = useMemo(() => {
    if (!workspace) return "Ubintrack WMS";
    return (workspace.app_title || workspace.name || "Ubintrack WMS").trim();
  }, [workspace]);

  const value = useMemo(
    () => ({
      workspace,
      displayName,
      workspaceStatus,
      reloadWorkspace: () => mutate(),
    }),
    [workspace, displayName, workspaceStatus, mutate],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace debe usarse dentro de WorkspaceProvider");
  return ctx;
}
