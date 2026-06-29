"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useWorkspace } from "@/context/WorkspaceContext";
import { formatDocumentTitle, getViewTitleFromPath } from "@/lib/wmsPageTitle";

export function WmsDocumentTitle() {
  const pathname = usePathname();
  const { displayName } = useWorkspace();

  useEffect(() => {
    const viewTitle = getViewTitleFromPath(pathname);
    document.title = formatDocumentTitle(viewTitle, displayName);
  }, [pathname, displayName]);

  return null;
}
