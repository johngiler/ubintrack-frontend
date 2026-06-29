const USER_TYPE_LABELS = {
  administrador: "Administrador",
  empleado: "Empleado",
  cliente: "Cliente",
};

export function getProfileUserTypeLabel(userType) {
  if (userType === "cliente") return "Cliente";
  if (userType === "empleado") return "Empleado";
  return userType || "—";
}

export function getUserRoleLabel(user) {
  if (!user) return "—";
  if (user.is_superuser || user.is_workspace_admin) return "Administrador";
  return USER_TYPE_LABELS[user.user_type] || user.user_type || "Usuario";
}

export function getPermissionsBadge(user) {
  if (!user) return "—";
  if (user.is_superuser || user.is_workspace_admin) return "Todos los permisos";
  if (!user.profile) return "Sin permisos";
  return user.profile;
}

export function isWorkspaceAdministrator(user) {
  if (!user) return false;
  if (user.is_superuser || user.is_workspace_admin) return true;
  return user.user_type === "administrador";
}

export function getHeaderOrgName(user, workspaceDisplayName) {
  if (user?.client?.name) return user.client.name;
  return workspaceDisplayName || "WMS";
}

export const USER_MODE_INFO = {
  administrador: {
    title: "Modo administrador",
    description:
      "Gestión del workspace, usuarios, clientes y configuración. Acceso completo a las operaciones del owner.",
    badges: ["Administrador", "Acceso total"],
    iconClass: "brand-icon-box",
  },
  cliente: {
    title: "Modo cliente",
    description:
      "Acceso limitado a la información de su cliente: inventario, bins y órdenes asociadas. No administra usuarios ni configuración del owner.",
    badges: ["Cliente"],
    iconClass: "bg-violet-100 text-violet-600",
  },
  empleado: {
    title: "Modo empleado",
    description:
      "Operaciones del WMS según el perfil asignado. Los permisos los define el administrador del owner.",
    badges: ["Empleado"],
    iconClass: "bg-emerald-100 text-emerald-600",
  },
};

export function getUserModeKey(user) {
  if (!user) return null;
  if (user.user_type === "cliente") return "cliente";
  if (user.user_type === "administrador" || user.is_workspace_admin) return "administrador";
  if (user.user_type === "empleado") return "empleado";
  return "empleado";
}
