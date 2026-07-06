/** Permisos efectivos del usuario (payload de /api/me/). */

export function userBypassesPermissions(user) {
  if (!user) return false;
  return Boolean(user.is_superuser || user.is_workspace_admin);
}

export function hasUserPermission(user, codename) {
  if (!user || !codename) return false;
  if (userBypassesPermissions(user)) return true;

  const perms = user.permissions || [];
  return perms.some((p) => {
    const key = typeof p === "string" ? p : p?.key;
    return key === codename;
  });
}
