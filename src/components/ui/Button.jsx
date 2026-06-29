"use client";

import { cn } from "@/lib/cn";

const variants = {
  primary: "btn-brand",
  secondary: "bg-white text-slate-700 ring-1 ring-slate-900/[0.06] hover:bg-slate-50 shadow-sm dark:bg-[var(--surface)] dark:text-[var(--foreground)] dark:ring-[var(--border)] dark:hover:bg-[var(--surface-hover)]",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
  ghost: "text-slate-600 hover:bg-slate-100 dark:text-[var(--foreground-muted)] dark:hover:bg-[var(--surface-hover)]",
  outline: "bg-transparent text-slate-700 ring-1 ring-slate-900/[0.06] hover:bg-slate-50 dark:text-[var(--foreground)] dark:ring-[var(--border)] dark:hover:bg-[var(--surface-hover)]",
  link: "text-[var(--brand-primary)] hover:text-[var(--accent-hover)] underline-offset-4 hover:underline p-0 h-auto",
};

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-11 px-5 text-sm gap-2 rounded-xl",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  icon: Icon,
  type = "button",
  ...props
}) {
  const isBrand = variant === "primary";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer",
        !isBrand &&
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--brand-primary)_40%,transparent)] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant] || variants.primary,
        sizes[size] || sizes.md,
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      ) : null}
      {children}
    </button>
  );
}

export function IconButton({ className, variant = "ghost", size = "md", children, ...props }) {
  const iconSizes = { sm: "h-8 w-8 rounded-lg", md: "h-9 w-9 rounded-xl", lg: "h-10 w-10 rounded-xl" };
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--brand-primary)_40%,transparent)]",
        variants[variant] || variants.ghost,
        iconSizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
