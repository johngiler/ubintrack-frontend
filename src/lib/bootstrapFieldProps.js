/** Props de react-bootstrap que no deben llegar al DOM. */
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
  return "ring-slate-900/[0.06] focus:ring-sky-500/15";
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
