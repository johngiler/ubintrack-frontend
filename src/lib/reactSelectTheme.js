import React from "react";

import { reactSelectInvalidStyles } from "@/lib/bootstrapFieldProps";
import { readThemeTokens } from "@/lib/themeTokens";

const CONTROL_HEIGHT = {
  default: 40,
  sm: 32,
};

/** Debe coincidir con Form.Control: text-sm (default) y text-xs (sm). */
const FONT_SIZE = {
  default: "0.875rem",
  sm: "0.8125rem",
};

function contextFontSize(size) {
  return FONT_SIZE[size] ?? FONT_SIZE.default;
}

export function resolveReactSelectComponent(mod) {
  if (typeof window === "undefined") return null;
  const comp = mod?.default ?? mod;
  if (!comp) return null;
  if (typeof comp === "function" || typeof comp === "object") return comp;
  return null;
}

export function optionLabelFromChildren(children) {
  if (children == null) return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  return String(children)
    .replace(/\s+/g, " ")
    .trim();
}

export function optionsFromChildren(children) {
  if (!children) return [];

  return React.Children.toArray(children)
    .filter((child) => child?.type === "option")
    .map((child, index) => ({
      value: child.props.value ?? "",
      label: optionLabelFromChildren(child.props.children),
      isDisabled: Boolean(child.props.disabled),
      key: child.key ?? `${child.props.value ?? "opt"}-${index}`,
    }));
}

export function findSelectOption(options, value) {
  if (value == null || value === "") {
    return options.find((opt) => opt.value === "") ?? null;
  }
  return options.find((opt) => String(opt.value) === String(value)) ?? null;
}

export function buildReactSelectStyles({
  isInvalid = false,
  size = "default",
  styles = {},
  isDark = false,
} = {}) {
  const minHeight = CONTROL_HEIGHT[size] ?? CONTROL_HEIGHT.default;
  const invalidStyles = reactSelectInvalidStyles(isInvalid);
  const tokens = typeof window !== "undefined" ? readThemeTokens() : null;

  const surface = tokens?.surface ?? (isDark ? "#1e293b" : "#ffffff");
  const foreground = tokens?.foreground ?? (isDark ? "#f1f5f9" : "#0f172a");
  const foregroundMuted = tokens?.foregroundMuted ?? (isDark ? "#94a3b8" : "#64748b");
  const border = tokens?.inputBorder ?? tokens?.border ?? (isDark ? "rgba(148,163,184,0.28)" : "#e2e8f0");
  const surfaceHover = tokens?.surfaceHover ?? (isDark ? "#334155" : "#f0f9ff");
  const accent = tokens?.accent ?? "#0ea5e9";

  function withFont(key, base, state, extra = {}) {
    const fontSize = contextFontSize(size);
    const custom = styles[key]?.(base, state) ?? {};
    const merged = {
      ...base,
      fontSize,
      ...extra,
      ...custom,
    };

    // Los overrides de vistas suelen hacer `...base` y restauran el fondo blanco por defecto.
    if (extra.backgroundColor != null && key !== "option") {
      merged.backgroundColor = extra.backgroundColor;
    }
    if (extra.color != null && key !== "option") {
      merged.color = extra.color;
    }
    if (custom.borderColor != null) {
      merged.borderColor = custom.borderColor;
    } else if (extra.borderColor != null) {
      merged.borderColor = extra.borderColor;
    }
    if (custom.boxShadow != null) {
      merged.boxShadow = custom.boxShadow;
    } else if (extra.boxShadow != null) {
      merged.boxShadow = extra.boxShadow;
    }

    return merged;
  }

  return {
    ...styles,
    container: (base, state) => ({
      ...base,
      width: "100%",
      fontSize: contextFontSize(size),
      ...(styles.container?.(base, state) ?? {}),
    }),
    control: (base, state) => ({
      ...withFont("control", base, state, {
        minHeight,
        borderRadius: 12,
        backgroundColor: state.isDisabled ? surfaceHover : surface,
        borderColor: isInvalid ? "#f87171" : border,
        color: foreground,
        boxShadow: state.isFocused
          ? isInvalid
            ? "0 0 0 1px #f87171"
            : `0 0 0 1px ${accent}`
          : "none",
        "&:hover": {
          borderColor: isInvalid ? "#ef4444" : isDark ? "rgba(148,163,184,0.38)" : "#cbd5e1",
        },
      }),
      ...(invalidStyles.control?.(base, state) ?? {}),
    }),
    valueContainer: (base, state) =>
      withFont("valueContainer", base, state, {
        padding: size === "sm" ? "0 8px" : base.padding,
      }),
    singleValue: (base, state) => withFont("singleValue", base, state, { color: foreground }),
    multiValue: (base, state) => withFont("multiValue", base, state),
    multiValueLabel: (base, state) => withFont("multiValueLabel", base, state),
    input: (base, state) =>
      withFont("input", base, state, {
        margin: 0,
        padding: 0,
        color: foreground,
      }),
    placeholder: (base, state) =>
      withFont("placeholder", base, state, {
        color: foregroundMuted,
      }),
    menu: (base, state) =>
      withFont("menu", base, state, {
        zIndex: 9999,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: surface,
        border: `1px solid ${border}`,
      }),
    menuPortal: (base, state) => ({
      ...base,
      zIndex: 9999,
      ...(styles.menuPortal?.(base, state) ?? {}),
    }),
    menuList: (base, state) => withFont("menuList", base, state),
    option: (base, state) =>
      withFont("option", base, state, {
        backgroundColor: state.isSelected
          ? accent
          : state.isFocused
            ? surfaceHover
            : surface,
        color: state.isSelected ? "#fff" : foreground,
      }),
    dropdownIndicator: (base, state) =>
      withFont("dropdownIndicator", base, state, {
        color: foregroundMuted,
      }),
    clearIndicator: (base, state) =>
      withFont("clearIndicator", base, state, {
        color: foregroundMuted,
      }),
    loadingIndicator: (base, state) =>
      withFont("loadingIndicator", base, state, {
        color: accent,
      }),
  };
}

export function createSelectChangeHandler(onChange, name) {
  if (typeof onChange !== "function") return undefined;

  return (option) => {
    onChange({
      target: {
        name: name ?? "",
        value: option?.value ?? "",
      },
    });
  };
}
