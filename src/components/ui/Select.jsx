"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactSelect, { components as rsComponents } from "react-select";

import { cn } from "@/lib/cn";
import { splitBootstrapFieldProps } from "@/lib/bootstrapFieldProps";
import { useTheme } from "@/context/ThemeContext";
import {
  buildReactSelectStyles,
  createSelectChangeHandler,
  findSelectOption,
  optionsFromChildren,
  resolveReactSelectComponent,
} from "@/lib/reactSelectTheme";

function resolveSelectComponent() {
  return resolveReactSelectComponent(ReactSelect);
}

function SafeInput(props) {
  const { value, ...rest } = props;
  return <rsComponents.Input {...rest} value={value ?? ""} />;
}

/**
 * Select estático basado en react-select.
 * Acepta `options` o `<option>` como children (compatibilidad con Form.Select).
 */
export default function Select(props) {
  const { isInvalid, domProps } = splitBootstrapFieldProps(props);
  const {
    options: optionsProp,
    children,
    value,
    onChange,
    name,
    id,
    isDisabled,
    disabled,
    placeholder,
    size,
    styles,
    className,
    style,
    inputId,
    isClearable,
    isSearchable,
    isMulti,
    ...rest
  } = domProps;

  const [SelectComponent, setSelectComponent] = useState(() => resolveSelectComponent());
  const multi = Boolean(isMulti);

  useEffect(() => {
    if (!SelectComponent) {
      setSelectComponent(() => resolveSelectComponent());
    }
  }, [SelectComponent]);

  const options = useMemo(() => {
    if (Array.isArray(optionsProp)) {
      return optionsProp;
    }
    return optionsFromChildren(children);
  }, [optionsProp, children]);

  const selected = useMemo(() => {
    if (multi) {
      const values = Array.isArray(value)
        ? value
        : value != null && value !== ""
          ? [value]
          : [];
      return values
        .map((item) => findSelectOption(options, item))
        .filter(Boolean);
    }
    return findSelectOption(options, value);
  }, [options, value, multi]);

  const { isDark } = useTheme();

  const mergedStyles = useMemo(
    () => buildReactSelectStyles({ isInvalid, size, styles, isDark }),
    [isInvalid, size, styles, isDark],
  );

  if (!SelectComponent) {
    return <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50" />;
  }

  return (
    <div className={cn(size === "sm" ? "text-xs" : "text-sm", className)} style={style}>
      <SelectComponent
        {...rest}
        autoComplete={rest.autoComplete ?? "off"}
        inputId={inputId ?? id}
        instanceId={id}
        classNamePrefix="react-select"
        options={options}
        value={multi ? selected : selected ?? null}
        onChange={createSelectChangeHandler(onChange, name, multi)}
        isDisabled={Boolean(disabled ?? isDisabled)}
        placeholder={placeholder ?? "Seleccionar…"}
        isClearable={Boolean(isClearable)}
        isMulti={multi}
        isSearchable={isSearchable ?? options.length > 8}
        styles={mergedStyles}
        components={{ ...(rest.components || {}), Input: SafeInput }}
        noOptionsMessage={rest.noOptionsMessage ?? (() => "Sin opciones")}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
      />
    </div>
  );
}
