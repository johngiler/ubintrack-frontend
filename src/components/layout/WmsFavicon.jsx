"use client";

import { useEffect } from "react";

import { useWorkspace } from "@/context/WorkspaceContext";
import { getWorkspaceIconUrl, iconMimeFromHref } from "@/lib/workspaceMedia";

const FAVICON_SELECTOR = 'link[data-wms-favicon="true"]';

function applyFavicon(href) {
  let link = document.querySelector(FAVICON_SELECTOR);

  if (!href) {
    link?.remove();
    return;
  }

  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.setAttribute("data-wms-favicon", "true");
    document.head.appendChild(link);
  }

  const mime = iconMimeFromHref(href);
  if (mime) link.type = mime;
  else link.removeAttribute("type");

  link.href = href;
}

export function WmsFavicon() {
  const { workspace } = useWorkspace();

  useEffect(() => {
    applyFavicon(getWorkspaceIconUrl(workspace));
  }, [workspace]);

  return null;
}
