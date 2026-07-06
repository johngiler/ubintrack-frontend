import { formatHumanCount } from "@/lib/formatHumanCount";
import { cn } from "@/lib/cn";

/**
 * @param {{ count?: number | null, active?: boolean, className?: string }} props
 */
export function NavCountBadge({ count, active = false, className }) {
  const label = formatHumanCount(count);
  if (!label) return null;

  return (
    <span
      aria-hidden
      className={cn(
        "ml-auto shrink-0 rounded-md px-1.5 py-0.5 tabular-nums text-[10px] font-medium leading-none tracking-wide",
        active
          ? "bg-[color-mix(in_srgb,var(--brand-primary)_14%,transparent)] text-[var(--brand-primary)]"
          : "bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] text-[var(--foreground-muted)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
