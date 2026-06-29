"use client";

import { useEffect, useMemo, useState } from "react";
import AsyncReactSelect from "react-select/async";

import { cn } from "@/lib/cn";
import { splitBootstrapFieldProps } from "@/lib/bootstrapFieldProps";
import { buildReactSelectStyles, resolveReactSelectComponent } from "@/lib/reactSelectTheme";

function resolveAsyncSelectComponent() {
  return resolveReactSelectComponent(AsyncReactSelect);
}

export default function AsyncSelect(props) {
  const { isInvalid, domProps } = splitBootstrapFieldProps(props);
  const {
    styles,
    loadOptions,
    size,
    className,
    classNamePrefix = "react-select",
    ...rest
  } = domProps;

  const [SelectComponent, setSelectComponent] = useState(() => resolveAsyncSelectComponent());

  useEffect(() => {
    if (!SelectComponent) {
      setSelectComponent(() => resolveAsyncSelectComponent());
    }
  }, [SelectComponent]);

  const mergedStyles = useMemo(
    () => buildReactSelectStyles({ isInvalid, size, styles }),
    [isInvalid, size, styles],
  );

  if (!SelectComponent) {
    return <div className="h-10 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className={cn(size === "sm" ? "text-xs" : "text-sm", className)}>
      <SelectComponent
        {...rest}
        classNamePrefix={classNamePrefix}
        loadOptions={loadOptions}
        styles={mergedStyles}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
      />
    </div>
  );
}
