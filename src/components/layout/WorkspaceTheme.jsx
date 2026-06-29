"use client";

import { useEffect } from "react";

import { useWorkspace } from "@/context/WorkspaceContext";
import { applyWorkspaceTheme } from "@/lib/workspaceTheme";

export function WorkspaceTheme() {
  const { workspace } = useWorkspace();

  useEffect(() => {
    applyWorkspaceTheme(workspace);
  }, [workspace]);

  return null;
}
