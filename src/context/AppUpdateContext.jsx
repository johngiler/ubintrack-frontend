"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { getLocalAppBuildId } from "@/lib/appBuildId";

const AppUpdateContext = createContext(null);

export function AppUpdateProvider({ children }) {
  const localBuildId = getLocalAppBuildId();
  const [remoteBuildId, setRemoteBuildId] = useState(null);
  const [dismissedBuildId, setDismissedBuildId] = useState(null);

  const notifyRemoteBuild = useCallback(
    (buildId) => {
      const cleaned = String(buildId || "").trim();
      if (!cleaned) return;
      if (cleaned === localBuildId) {
        setRemoteBuildId(null);
        setDismissedBuildId(null);
        return;
      }
      setRemoteBuildId(cleaned);
    },
    [localBuildId],
  );

  const updateAvailable =
    remoteBuildId != null &&
    remoteBuildId !== localBuildId &&
    dismissedBuildId !== remoteBuildId;

  const dismissUpdate = useCallback(() => {
    if (!remoteBuildId) return;
    setDismissedBuildId(remoteBuildId);
  }, [remoteBuildId]);

  const reloadForUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  const value = useMemo(
    () => ({
      updateAvailable,
      dismissUpdate,
      reloadForUpdate,
      notifyRemoteBuild,
    }),
    [updateAvailable, dismissUpdate, reloadForUpdate, notifyRemoteBuild],
  );

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

export function useAppUpdate() {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) {
    throw new Error("useAppUpdate debe usarse dentro de AppUpdateProvider");
  }
  return ctx;
}

export function useAppUpdateOptional() {
  return useContext(AppUpdateContext);
}
