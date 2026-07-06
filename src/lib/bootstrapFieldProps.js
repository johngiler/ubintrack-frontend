/** Props de react-bootstrap que no deben llegar al DOM. */
import { cn } from "@/lib/cn";

export function splitBootstrapFieldProps(props = {}) {
  const {
    isInvalid,
    isValid,
    plaintext,
    htmlSize,
    feedback,
    feedbackType,
    ...domProps
  } = props;

  return {
    isInvalid: Boolean(isInvalid),
    isValid: Boolean(isValid),
    plaintext,
    htmlSize,
    feedback,
    feedbackType,
    domProps,
  };
}

export function fieldRingClass(isInvalid, isValid) {
  if (isInvalid) return "ring-red-500/40 focus:ring-red-500/25";
  if (isValid) return "ring-emerald-500/30 focus:ring-emerald-500/20";
  return "focus:ring-sky-500/15";
}

/** Solo el contorno del campo; fondo igual que antes (--surface). */
export function inputFieldRingClass(isInvalid, isValid, className) {
  return cn(
    "rounded-xl bg-[var(--surface)] text-sm text-[var(--foreground)] ring-1 ring-[var(--input-border)]",
    "placeholder:text-[var(--foreground-muted)] transition-colors",
    "focus:outline-none focus:ring-2",
    fieldRingClass(isInvalid, isValid),
    className,
  );
}

export function reactSelectInvalidStyles(isInvalid) {
  if (!isInvalid) return {};
  return {
    control: (base, state) => ({
      borderColor: "#f87171",
      boxShadow: state.isFocused ? "0 0 0 1px #f87171" : base.boxShadow,
      "&:hover": { borderColor: "#ef4444" },
    }),
  };
}
