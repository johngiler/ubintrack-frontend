import { cn } from "@/lib/cn";

export function Table({ children, className, striped, bordered, hover, responsive, size, ...props }) {
  return (
    <div className={cn(responsive !== false && "overflow-x-auto rounded-xl")}>
      <table
        className={cn(
          "w-full min-w-[640px] border-collapse text-left text-sm text-[var(--foreground)]",
          bordered && "shadow-[inset_0_0_0_1px_var(--border-subtle)]",
          size === "sm" && "text-xs",
          hover && "[&_tbody_tr:hover]:bg-[var(--surface-hover)]/50",
          striped && "[&_tbody_tr:nth-child(even)]:bg-[var(--surface-hover)]/30",
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

Table.Head = function TableHead({ children, className }) {
  return (
    <thead
      className={cn(
        "border-b border-[var(--border-subtle)] bg-[var(--surface-hover)]/60 text-xs uppercase tracking-wide text-[var(--foreground-muted)]",
        className,
      )}
    >
      {children}
    </thead>
  );
};

Table.Body = function TableBody({ children, className }) {
  return (
    <tbody className={cn("divide-y divide-[var(--border-subtle)]", className)}>{children}</tbody>
  );
};

Table.Row = function TableRow({ children, className, active, ...props }) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-[var(--surface-hover)]/50",
        active && "[background:var(--brand-surface)]",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

Table.HeaderCell = function TableHeaderCell({ children, className, ...props }) {
  return (
    <th className={cn("px-4 py-3 font-semibold", className)} {...props}>
      {children}
    </th>
  );
};

Table.Cell = function TableCell({ children, className, ...props }) {
  return (
    <td className={cn("px-4 py-3.5 text-[var(--foreground)]", className)} {...props}>
      {children}
    </td>
  );
};
