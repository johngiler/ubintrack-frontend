import { WMS_NAV_GROUPS, canSeeNavItem } from "@/lib/wmsNavConfig";

/** Rutas protegidas fuera del menú lateral. */
const WMS_EXTRA_ROUTE_RULES = [{ href: "/core/owner", adminOnly: true }];

function collectNavRouteRules() {
  return WMS_NAV_GROUPS.flatMap((group) => group.items);
}

/** Reglas ordenadas: rutas más específicas primero. */
const WMS_ROUTE_RULES = [...collectNavRouteRules(), ...WMS_EXTRA_ROUTE_RULES].sort(
  (a, b) => b.href.length - a.href.length,
);

/** Primer enlace del menú lateral visible para el usuario (mismo criterio que el sidebar). */
export function getFirstVisibleNavHref(user) {
  if (!user) return "/login";

  for (const group of WMS_NAV_GROUPS) {
    for (const item of group.items) {
      if (canSeeNavItem(item, user)) {
        return item.href;
      }
    }
  }

  return "/inventory/products";
}

export function getDefaultHomeRoute(user) {
  return getFirstVisibleNavHref(user);
}

export function getRouteAccessRule(pathname) {
  if (!pathname) return null;

  for (const rule of WMS_ROUTE_RULES) {
    if (pathname === rule.href || pathname.startsWith(`${rule.href}/`)) {
      return rule;
    }
  }

  return null;
}

export function canAccessRoute(pathname, user) {
  if (!user) return false;

  const rule = getRouteAccessRule(pathname);
  if (!rule) return true;

  return canSeeNavItem(rule, user);
}

export function getRouteAccessMessage(pathname) {
  const rule = getRouteAccessRule(pathname);
  if (rule?.adminOnly) {
    return "Esta sección está disponible solo para administradores del workspace.";
  }
  if (rule?.staffOnly) {
    return "Esta sección no está disponible para usuarios cliente.";
  }
  return "No tienes permiso para acceder a esta sección.";
}
