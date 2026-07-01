import { cn } from "@/lib/cn";

const variants = {
  default: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
  primary: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
  danger: "bg-red-50 text-red-700 ring-1 ring-red-200/80",
  secondary: "bg-slate-50 text-slate-600 ring-1 ring-slate-200/60",
  info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80",
  dark: "bg-slate-800 text-slate-100 ring-1 ring-slate-700",
  light: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
};

const dots = {
  default: "bg-slate-400",
  primary: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  secondary: "bg-slate-400",
  info: "bg-sky-500",
  dark: "bg-slate-300",
  light: "bg-slate-400",
};

const bgMap = {
  warning: "warning",
  success: "success",
  danger: "danger",
  primary: "primary",
  secondary: "secondary",
  info: "info",
  dark: "dark",
  light: "light",
};

export function Badge({ children, variant = "default", bg, text, dot = false, className }) {
  const v = bg ? bgMap[bg] || "default" : variant;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[v] || variants.default,
        className,
      )}
    >
      {dot !== false ? (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dots[v] || dots.default)} />
      ) : null}
      {children}
    </span>
  );
}

/** Variante de badge según estado de orden/bin */
export function statusBadgeVariant(status) {
  const map = {
    pendiente: "warning",
    en_progreso: "primary",
    completada: "success",
    cancelada: "danger",
    en_recibo: "warning",
    almacenado: "success",
    en_despacho: "primary",
    despachado: "secondary",
  };
  return map[status] || "default";
}
