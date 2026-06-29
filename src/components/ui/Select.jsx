"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactSelect from "react-select";

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
    ...rest
  } = domProps;

  const [SelectComponent, setSelectComponent] = useState(() => resolveSelectComponent());

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

  const selected = useMemo(
    () => findSelectOption(options, value),
    [options, value],
  );

  const { isDark } = useTheme();

  const mergedStyles = useMemo(
    () => buildReactSelectStyles({ isInvalid, size, styles, isDark }),
    [isInvalid, size, styles, isDark],
  );

  if (!SelectComponent) {
    return <div className="h-10 animate-pulse rounded-xl bg-slate-100" />;
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
        value={selected}
        onChange={createSelectChangeHandler(onChange, name)}
        isDisabled={Boolean(disabled ?? isDisabled)}
        placeholder={placeholder ?? "Seleccionar…"}
        isClearable={Boolean(isClearable)}
        isSearchable={isSearchable ?? options.length > 8}
        styles={mergedStyles}
        noOptionsMessage={rest.noOptionsMessage ?? (() => "Sin opciones")}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
      />
    </div>
  );
}
