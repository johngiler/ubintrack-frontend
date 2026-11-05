"use client";

import { createContext, useContext, useMemo } from "react";
import useSWR from "swr";

import { rewriteLocalApiPath, clientApiBase } from "@/lib/apiBase";
import { swrKeys } from "@/lib/swr";
import { envTenantSlugFallback, workspaceSlugRequestHeaders } from "@/lib/tenant";

const WorkspaceContext = createContext(undefined);

async function fetchWorkspace() {
  const headers = workspaceSlugRequestHeaders(
    typeof window !== "undefined" ? window.location.hostname : undefined,
  );
  const url = rewriteLocalApiPath("/api/workspace/current/");
  const res = await fetch(clientApiBase() === "" ? url : `${clientApiBase()}${url}`, {
    headers,
    cache: "no-store",
  });
  if (res.status === 404) return { workspaceStatus: "missing", workspace: null };
  if (!res.ok) throw new Error("No se pudo cargar el workspace");
  const workspace = await res.json();
  return { workspaceStatus: "ready", workspace };
}

export function WorkspaceProvider({ children, initialTenantSlug, initialWorkspace = null }) {
  const slug = initialTenantSlug || envTenantSlugFallback();
  const { data, error, isLoading, mutate } = useSWR(swrKeys.workspace(slug), fetchWorkspace, {
    revalidateOnFocus: false,
    fallbackData: initialWorkspace
      ? { workspaceStatus: "ready", workspace: initialWorkspace }
      : undefined,
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
