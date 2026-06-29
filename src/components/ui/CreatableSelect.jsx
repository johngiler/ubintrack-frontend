"use client";

import React, { useEffect, useMemo, useState } from "react";
import Creatable from "react-select/creatable";

import { cn } from "@/lib/cn";
import { splitBootstrapFieldProps } from "@/lib/bootstrapFieldProps";
import {
  buildReactSelectStyles,
  findSelectOption,
  resolveReactSelectComponent,
} from "@/lib/reactSelectTheme";

function resolveCreatableComponent() {
  if (typeof window === "undefined") return null;
  const comp = Creatable?.default ?? Creatable;
  if (!comp) return null;
  return comp;
}

export default function CreatableSelect(props) {
  const { isInvalid, domProps } = splitBootstrapFieldProps(props);
  const {
    options = [],
    value,
    onChange,
    onCreateOption,
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
    formatCreateLabel,
    getNewOptionData,
    formatOptionLabel,
    noOptionsMessage,
    ...rest
  } = domProps;

  const [SelectComponent, setSelectComponent] = useState(() => resolveCreatableComponent());

  useEffect(() => {
    if (!SelectComponent) {
      setSelectComponent(() => resolveCreatableComponent());
    }
  }, [SelectComponent]);

  const selected = useMemo(() => {
    if (value == null || value === "") return null;
    return (
      findSelectOption(options, value) ?? {
        value,
        label: formatOptionLabel?.({ value, label: String(value) }) ?? String(value),
      }
    );
  }, [options, value, formatOptionLabel]);

  const mergedStyles = useMemo(
    () => buildReactSelectStyles({ isInvalid, size, styles }),
    [isInvalid, size, styles],
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
        onChange={(option) => {
          onChange?.({
            target: {
              name: name ?? "",
              value: option?.value ?? "",
            },
          });
        }}
        onCreateOption={onCreateOption}
        getNewOptionData={
          getNewOptionData ??
          ((inputValue, optionLabel) => ({
            label: optionLabel,
            value: inputValue,
            __isNew__: true,
          }))
        }
        formatCreateLabel={formatCreateLabel ?? ((inputValue) => `Crear "${inputValue}"`)}
        formatOptionLabel={formatOptionLabel}
        isDisabled={Boolean(disabled ?? isDisabled)}
        placeholder={placeholder ?? "Seleccionar…"}
        isClearable={Boolean(isClearable)}
        isSearchable
        styles={mergedStyles}
        noOptionsMessage={noOptionsMessage ?? (() => "Sin opciones")}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
      />
    </div>
  );
}
