"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/cn";

const config = {
  success: {
    icon: CheckCircle2,
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  danger: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300",
  },
  warning: {
    icon: AlertCircle,
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
  },
  info: {
    icon: Info,
    className: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300",
  },
};

export function Alert({ variant = "info", children, className, onClose, dismissible, ...props }) {
  const { icon: Icon, className: variantClass } = config[variant] || config.info;
  const showClose = Boolean(onClose || dismissible);
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3 text-sm animate-fade-in",
        variantClass,
        className,
      )}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      <div className="flex-1">{children}</div>
      {showClose && onClose ? (
        <button type="button" onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
