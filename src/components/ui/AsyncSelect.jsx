"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncReactSelect from "react-select/async";
import { components as rsComponents } from "react-select";

import { cn } from "@/lib/cn";
import { splitBootstrapFieldProps } from "@/lib/bootstrapFieldProps";
import { buildReactSelectStyles, resolveReactSelectComponent } from "@/lib/reactSelectTheme";
import { useTheme } from "@/context/ThemeContext";

function resolveAsyncSelectComponent() {
  return resolveReactSelectComponent(AsyncReactSelect);
}

/** Evita value=undefined en el <input> interno (React 19 / react-select). */
function SafeInput(props) {
  const { value, ...rest } = props;
  return <rsComponents.Input {...rest} value={value ?? ""} />;
}

function defaultOptionValue(option) {
  if (option == null) return "";
  if (option.value != null) return option.value;
  if (option.id != null) return option.id;
  return "";
}

function defaultOptionLabel(option) {
  if (option == null) return "";
  if (option.label != null && option.label !== "") return option.label;
  if (option.code != null && option.code !== "") return String(option.code);
  if (option.name != null && option.name !== "") return String(option.name);
  if (option.value != null) return String(option.value);
  if (option.id != null) return String(option.id);
  return "";
}

function normalizeSelectValue(value) {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSelectValue(item)).filter(Boolean);
  }
  if (typeof value !== "object") {
    return { value, label: String(value) };
  }
  const nextValue = value.value ?? value.id ?? null;
  const nextLabel =
    value.label ?? value.code ?? value.name ?? (nextValue != null ? String(nextValue) : "");
  if (nextValue == null) return null;
  return { ...value, value: nextValue, label: nextLabel };
}

export default function AsyncSelect(props) {
  const { isInvalid, domProps } = splitBootstrapFieldProps(props);
  const {
    styles,
    loadOptions,
    size,
    className,
    classNamePrefix = "react-select",
    value,
    inputValue: inputValueProp,
    onInputChange,
    components: componentsProp,
    defaultValue: _defaultValue,
    defaultInputValue: _defaultInputValue,
    getOptionValue: getOptionValueProp,
    getOptionLabel: getOptionLabelProp,
    ...rest
  } = domProps;

  const [SelectComponent, setSelectComponent] = useState(() => resolveAsyncSelectComponent());
  const isInputControlled = inputValueProp !== undefined;
  const [internalInputValue, setInternalInputValue] = useState("");

  useEffect(() => {
    if (!SelectComponent) {
      setSelectComponent(() => resolveAsyncSelectComponent());
    }
  }, [SelectComponent]);

  const { isDark } = useTheme();

  const mergedStyles = useMemo(
    () => buildReactSelectStyles({ isInvalid, size, styles, isDark }),
    [isInvalid, size, styles, isDark],
  );

  const mergedComponents = useMemo(
    () => ({ ...componentsProp, Input: SafeInput }),
    [componentsProp],
  );

  const handleInputChange = useCallback(
    (newValue, actionMeta) => {
      const fromParent = onInputChange?.(newValue, actionMeta);
      const resolved = typeof fromParent === "string" ? fromParent : newValue;
      const safe = resolved ?? "";
      if (!isInputControlled) {
        setInternalInputValue(safe);
      }
      return safe;
    },
    [isInputControlled, onInputChange],
  );

  if (!SelectComponent) {
    return <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50" />;
  }

  const inputValue = isInputControlled ? (inputValueProp ?? "") : internalInputValue;
  const normalizedValue = normalizeSelectValue(value);

  return (
    <div className={cn(size === "sm" ? "text-xs" : "text-sm", className)}>
      <SelectComponent
        {...rest}
        value={normalizedValue}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        components={mergedComponents}
        classNamePrefix={classNamePrefix}
        loadOptions={loadOptions}
        styles={mergedStyles}
        getOptionValue={getOptionValueProp ?? defaultOptionValue}
        getOptionLabel={getOptionLabelProp ?? defaultOptionLabel}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
      />
    </div>
  );
}
