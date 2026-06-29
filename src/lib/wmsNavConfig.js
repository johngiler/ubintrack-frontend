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

export const WMS_NAV_GROUPS = [
  {
    label: "Dashboards",
    items: [
      { href: "/dashboards/sales", label: "Movimientos", icon: BarChart3, staffOnly: true },
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
      { href: "/inventory/products", label: "Productos", icon: Package },
      { href: "/inventory/bins", label: "Bins", icon: Boxes },
    ],
  },
  {
    label: "Órdenes",
    items: [
      { href: "/order/entries", label: "Entradas", icon: ArrowDownToLine },
      { href: "/order/exits", label: "Salidas", icon: ArrowUpFromLine },
    ],
  },
  {
    label: "Bodega",
    items: [
      { href: "/storage/storages", label: "Bodegas", icon: Building2, staffOnly: true },
      { href: "/storage/cavas", label: "Cavas", icon: Building, staffOnly: true },
      { href: "/storage/positions", label: "Posiciones", icon: Grid3x3, staffOnly: true },
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
      { href: "/tasks/tasks", label: "Tareas", icon: ListTodo, staffOnly: true },
      { href: "/tasks/trackings", label: "Seguimiento", icon: Timer, staffOnly: true },
    ],
  },
];

export function canSeeNavItem(item, user) {
  if (!user) return false;
  if (user.is_superuser || user.is_workspace_admin) return true;
  if (item.adminOnly && user.user_type !== "administrador") return false;
  if (item.staffOnly && user.user_type === "cliente") return false;
  return true;
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
