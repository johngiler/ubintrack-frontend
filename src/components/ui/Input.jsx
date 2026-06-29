"use client";

import ReactSelectWrapper from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { fieldRingClass, splitBootstrapFieldProps } from "@/lib/bootstrapFieldProps";

export function Input(props) {
  const { isInvalid, isValid, domProps } = splitBootstrapFieldProps(props);
  const { className, icon: Icon, ...rest } = domProps;

  return (
    <div className="relative">
      {Icon ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-[var(--foreground-muted)]"
        >
          <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
        </span>
      ) : null}
      <input
        className={cn(
          "flex h-10 w-full rounded-xl bg-[var(--surface)] text-sm text-[var(--foreground)] ring-1 ring-[var(--border)]",
          "placeholder:text-[var(--foreground-muted)] transition-colors",
          "focus:outline-none focus:ring-2",
          fieldRingClass(isInvalid, isValid),
          "disabled:cursor-not-allowed disabled:opacity-50",
          Icon ? "pl-10 pr-3" : "px-3",
          rest.type === "search" &&
            "[appearance:textfield] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
          className,
        )}
        {...rest}
      />
    </div>
  );
}

export function Select(props) {
  return <ReactSelectWrapper {...props} />;
}

export function Label({ children, className, ...props }) {
  return (
    <label className={cn("mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]", className)} {...props}>
      {children}
    </label>
  );
}

export function Textarea(props) {
  const { isInvalid, isValid, domProps } = splitBootstrapFieldProps(props);
  const { className, ...rest } = domProps;

  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] ring-1 ring-[var(--border)]",
        "focus:border-sky-400 focus:outline-none focus:ring-2",
        fieldRingClass(isInvalid, isValid),
        className,
      )}
      {...rest}
    />
  );
}
