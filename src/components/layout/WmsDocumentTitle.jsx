"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useWorkspace } from "@/context/WorkspaceContext";
import { formatDocumentTitle, getViewTitleFromPath } from "@/lib/wmsPageTitle";

export function WmsDocumentTitle() {
  const pathname = usePathname();
  const { displayName } = useWorkspace();

  useEffect(() => {
    const nextTitle = formatDocumentTitle(getViewTitleFromPath(pathname), displayName);
    const apply = () => {
      if (document.title !== nextTitle) document.title = nextTitle;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [pathname, displayName]);

  return null;
}
