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

export function getDefaultHomeRoute(user) {
  if (!user) return "/login";
  if (user.is_superuser || user.is_workspace_admin || user.user_type === "administrador") {
    return "/dashboards/sales";
  }
  return "/inventory/bins";
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
