"use client";

/**
 * Adaptador compatible con react-bootstrap para migrar módulos rbcold con mínimos cambios.
 */
import React from "react";

import { cn } from "@/lib/cn";
import {
  fieldRingClass,
  splitBootstrapFieldProps,
} from "@/lib/bootstrapFieldProps";

import ReactSelectWrapper from "@/components/ui/Select";

export { Alert } from "@/components/ui/Alert";
export { Badge } from "@/components/ui/Badge";
export { Button } from "@/components/ui/Button";
export { Card } from "@/components/ui/Card";
export { Pagination } from "@/components/ui/PaginationBootstrap";
export { Input, Select, Label, Textarea } from "@/components/ui/Input";
export { Table } from "@/components/ui/Table";

export { Modal } from "@/components/ui/Modal";

export function Row({ children, className }) {
  return <div className={cn("grid grid-cols-12 gap-4", className)}>{children}</div>;
}

export function Col({ children, className, xl, lg, md, sm, xs = 12 }) {
  const span = xl || lg || md || sm || xs || 12;
  const spanClass =
    {
      12: "col-span-12",
      6: "col-span-12 md:col-span-6",
      4: "col-span-12 md:col-span-4",
      3: "col-span-12 md:col-span-3",
    }[span] || "col-span-12";
  return <div className={cn(spanClass, className)}>{children}</div>;
}

function FormControlFeedback({ children, type, className, ...props }) {
  if (!children) return null;
  return (
    <p
      className={cn(
        "mt-1 text-xs",
        type === "invalid" && "text-red-600",
        type === "valid" && "text-emerald-600",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

function FormControl(props) {
  const { isInvalid, isValid, domProps } = splitBootstrapFieldProps(props);
  const { className, size, as: As, rows, ...rest } = domProps;

  const sizeClass = size === "sm" ? "h-8 text-xs rounded-lg" : "";
  const base = cn(
    "flex w-full rounded-xl bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] ring-1 ring-[var(--border)]",
    "placeholder:text-[var(--foreground-muted)]",
    "focus:outline-none focus:ring-2",
    fieldRingClass(isInvalid, isValid),
    sizeClass,
    className,
  );

  if (As === "textarea" || rest.type === "textarea") {
    return <textarea rows={rows || 3} className={cn(base, "min-h-[88px] py-2")} {...rest} />;
  }
  if (rest.type === "file") {
    return (
      <input
        type="file"
        className={cn(
          base,
          "h-auto py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-sky-700",
        )}
        {...rest}
      />
    );
  }
  if (typeof As === "function") {
    return <As className={base} isInvalid={isInvalid} isValid={isValid} {...rest} />;
  }
  return <input className={cn(base, "h-10")} {...rest} />;
}

FormControl.Feedback = FormControlFeedback;
function FormSelect(props) {
  return <ReactSelectWrapper {...props} />;
}

function FormLabel({ children, className, ...props }) {
  return (
    <label className={cn("mb-1 block text-sm font-medium text-[var(--foreground)]", className)} {...props}>
      {children}
    </label>
  );
}

function FormGroup({ children, className, controlId: _controlId }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

function FormCheck(props) {
  const { domProps } = splitBootstrapFieldProps(props);
  const { label, checked, onChange, id, className, type = "checkbox", disabled, ...rest } = domProps;

  if (type === "switch") {
    return (
      <label
        htmlFor={id}
        className={cn(
          "inline-flex min-h-10 cursor-pointer items-center gap-3",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
          <input
            type="checkbox"
            id={id}
            checked={Boolean(checked)}
            onChange={onChange}
            disabled={disabled}
            className="peer sr-only"
            {...rest}
          />
          <span className="absolute inset-0 rounded-full bg-slate-200 transition-colors peer-checked:bg-[var(--brand-primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[color-mix(in_srgb,var(--brand-primary)_40%,transparent)]" />
          <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
        {label ? <span className="text-sm text-[var(--foreground)]">{label}</span> : null}
      </label>
    );
  }

  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]", className)}>
      <input
        type={type}
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="rounded border-slate-300 text-[var(--brand-primary)] focus:ring-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)]"
        {...rest}
      />
      {label}
    </label>
  );
}

function FormText({ children, className, muted, ...props }) {
  const isMuted = muted || className?.includes?.("text-muted");
  const isDanger = className?.includes?.("text-danger");
  return (
    <p
      className={cn(
        "mt-1 text-xs",
        isDanger && "text-red-600",
        isMuted && "text-[var(--foreground-muted)]",
        !isDanger && !isMuted && "text-[var(--foreground-muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/** Wrapper `<Form>` usado en modales migrados de rbcold */
function Form({ children, className, onSubmit, ...props }) {
  return (
    <form className={cn(className)} onSubmit={onSubmit} noValidate {...props}>
      {children}
    </form>
  );
}

Form.Control = FormControl;
Form.Select = FormSelect;
Form.Label = FormLabel;
Form.Group = FormGroup;
Form.Check = FormCheck;
Form.Text = FormText;

export { Form };

export function Dropdown({ children }) {
  return <div className="relative inline-block">{children}</div>;
}

Dropdown.Toggle = function DropdownToggle({ children, className, ...props }) {
  return (
    <button type="button" className={cn("inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--foreground)]", className)} {...props}>
      {children}
    </button>
  );
};

Dropdown.Menu = function DropdownMenu({ children, className }) {
  return (
    <div className={cn("absolute right-0 z-20 mt-1 min-w-[10rem] rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg", className)}>
      {children}
    </div>
  );
};

Dropdown.Item = function DropdownItem({ children, className, onClick, ...props }) {
  return (
    <button type="button" className={cn("block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)]", className)} onClick={onClick} {...props}>
      {children}
    </button>
  );
};

export function Spinner({ variant, size, className }) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        variant === "primary" && "text-[var(--brand-primary)]",
        className,
      )}
      role="status"
    />
  );
}

export function Tab({ children }) {
  return children;
}
Tab.isTab = true;

export function Tabs({ activeKey, onSelect, children, className, defaultActiveKey }) {
  const [active, setActive] = React.useState(activeKey ?? defaultActiveKey);
  React.useEffect(() => {
    if (activeKey != null) setActive(activeKey);
  }, [activeKey]);
  const select = onSelect || setActive;
  const items = React.Children.toArray(children).filter(
    (child) => React.isValidElement(child) && (child.type?.isTab || child.type === Tab),
  );
  const current = items.find((t) => t.props.eventKey === active) || items[0];

  return (
    <div className={className}>
      <div className="mb-4 flex gap-1 overflow-x-auto">
        {items.map((tab) => (
          <button
            key={tab.props.eventKey}
            type="button"
            onClick={() => select(tab.props.eventKey)}
            className={cn(
              "-mb-px shrink-0 px-4 py-2 text-sm font-medium transition-colors",
              active === tab.props.eventKey
                ? "brand-tab-active"
                : "text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--brand-primary)]",
            )}
          >
            {tab.props.title}
          </button>
        ))}
      </div>
      {current ? <div>{current.props.children}</div> : null}
    </div>
  );
}
