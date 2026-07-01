import { WMS_NAV_GROUPS } from "@/lib/wmsNavConfig";

const EXTRA_ROUTE_TITLES = {
  "/login": "Iniciar sesión",
  "/account/profile": "Mi cuenta",
};

const NAV_ITEMS_BY_PATH = WMS_NAV_GROUPS.flatMap((group) => group.items).sort(
  (a, b) => b.href.length - a.href.length,
);

export function getViewTitleFromPath(pathname = "/") {
  if (EXTRA_ROUTE_TITLES[pathname]) {
    return EXTRA_ROUTE_TITLES[pathname];
  }

  for (const item of NAV_ITEMS_BY_PATH) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return item.label;
    }
  }

  return null;
}

export function formatDocumentTitle(viewTitle, ownerName) {
  const owner = (ownerName || "WMS").trim();
  if (!viewTitle) return owner;
  return `${viewTitle} | ${owner}`;
}
