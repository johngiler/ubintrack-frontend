import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Boxes,
  Building,
  Building2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Grid3x3,
  IdCard,
  ListTodo,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Timer,
  User,
  Users,
  Warehouse,
  X,
} from "lucide-react";

import { hasUserPermission, userBypassesPermissions } from "@/lib/userPermissions";

export const WMS_NAV_GROUPS = [
  {
    label: "Dashboards",
    items: [
      { href: "/dashboard", label: "Movimientos", icon: BarChart3, adminOnly: true },
    ],
  },
  {
    label: "Principal",
    items: [
      { href: "/core/clients", label: "Clientes", icon: Users, adminOnly: true },
      { href: "/core/users", label: "Usuarios", icon: User, adminOnly: true },
      { href: "/core/profiles", label: "Perfiles", icon: IdCard, adminOnly: true },
    ],
  },
  {
    label: "Inventario",
    items: [
      { href: "/inventory/products", label: "Productos", icon: Package, viewPerm: "inventory.view_product" },
      { href: "/inventory/bins", label: "Bins", icon: Boxes, viewPerm: "inventory.view_bin" },
    ],
  },
  {
    label: "Órdenes",
    items: [
      { href: "/order/entries", label: "Entradas", icon: ArrowDownToLine, viewPerm: "order.view_entry" },
      { href: "/order/exits", label: "Salidas", icon: ArrowUpFromLine, viewPerm: "order.view_exit" },
    ],
  },
  {
    label: "Bodega",
    items: [
      {
        href: "/storage/storages",
        label: "Bodegas",
        icon: Building2,
        staffOnly: true,
        viewPerm: "storage.view_storage",
      },
      {
        href: "/storage/cavas",
        label: "Cámaras",
        icon: Building,
        staffOnly: true,
        viewPerm: "storage.view_cava",
      },
      {
        href: "/storage/positions",
        label: "Posiciones",
        icon: Grid3x3,
        staffOnly: true,
        viewPerm: "storage.view_position",
      },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/finance/tariffs", label: "Tarifas", icon: DollarSign, adminOnly: true },
      { href: "/finance/billing", label: "Calcular", icon: Calculator, adminOnly: true },
    ],
  },
  {
    label: "Tareas",
    items: [
      {
        href: "/tasks/tasks",
        label: "Tareas",
        icon: ListTodo,
        staffOnly: true,
        viewPerm: "task.view_task",
      },
      {
        href: "/tasks/trackings",
        label: "Seguimiento",
        icon: Timer,
        staffOnly: true,
        viewPerm: "task.view_tasklog",
      },
    ],
  },
];

export function canSeeNavItem(item, user) {
  if (!user) return false;
  if (userBypassesPermissions(user)) return true;
  if (item.adminOnly) return false;
  if (item.staffOnly && user.user_type === "cliente") return false;
  if (!item.viewPerm) return false;
  return hasUserPermission(user, item.viewPerm);
}

export {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  User,
  X,
};
