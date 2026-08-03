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
  return <rsComponents.Input {...props} value={props.value ?? ""} />;
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
    defaultValue,
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
    () => ({ Input: SafeInput, ...componentsProp }),
    [componentsProp],
  );

  const handleInputChange = useCallback(
    (newValue, actionMeta) => {
      const fromParent = onInputChange?.(newValue, actionMeta);
      const resolved = typeof fromParent === "string" ? fromParent : newValue;
      if (!isInputControlled) {
        setInternalInputValue(resolved ?? "");
      }
      return resolved ?? "";
    },
    [isInputControlled, onInputChange],
  );

  if (!SelectComponent) {
    return <div className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/50" />;
  }

  const inputValue = isInputControlled ? (inputValueProp ?? "") : internalInputValue;

  return (
    <div className={cn(size === "sm" ? "text-xs" : "text-sm", className)}>
      <SelectComponent
        {...rest}
        value={value ?? null}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        components={mergedComponents}
        classNamePrefix={classNamePrefix}
        loadOptions={loadOptions}
        styles={mergedStyles}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
      />
    </div>
  );
}
