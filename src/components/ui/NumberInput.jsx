"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { inputFieldRingClass, splitBootstrapFieldProps } from "@/lib/bootstrapFieldProps";

/**
 * Número sin flechas. Se puede borrar (vacío) y escribir libre;
 * al blur aplica min/max o `commitEmptyAs`.
 *
 * onChange(value, event) — value es number | emptyValue (default "").
 */
export default function NumberInput(props) {
  const { isInvalid, isValid, domProps } = splitBootstrapFieldProps(props);
  const {
    className,
    value,
    min,
    max,
    step,
    onChange,
    onBlur,
    emptyValue = "",
    commitEmptyAs,
    ...rest
  } = domProps;

  const focusedRef = useRef(false);
  const [text, setText] = useState(() => toDisplay(value));

  useEffect(() => {
    if (focusedRef.current) return;
    setText(toDisplay(value));
  }, [value]);

  function emit(nextText, event) {
    setText(nextText);
    if (!onChange) return;
    if (nextText === "" || nextText === "-" || nextText === "." || nextText === "-.") {
      onChange(emptyValue, event);
      return;
    }
    const parsed = Number(nextText);
    if (Number.isNaN(parsed)) return;
    onChange(parsed, event);
  }

  function commit(event) {
    focusedRef.current = false;
    let nextText = String(text ?? "").trim();
    if (nextText === "" || nextText === "-" || nextText === "." || nextText === "-.") {
      const fallback =
        commitEmptyAs !== undefined
          ? commitEmptyAs
          : min != null && `${min}` !== "" && !Number.isNaN(Number(min))
            ? Number(min)
            : 0;
      nextText = toDisplay(fallback);
      setText(nextText);
      onChange?.(fallback === "" ? emptyValue : Number(fallback), event);
    } else {
      let parsed = Number(nextText);
      if (!Number.isNaN(parsed)) {
        if (min != null && `${min}` !== "" && !Number.isNaN(Number(min)) && parsed < Number(min)) {
          parsed = Number(min);
        }
        if (max != null && `${max}` !== "" && !Number.isNaN(Number(max)) && parsed > Number(max)) {
          parsed = Number(max);
        }
        nextText = toDisplay(parsed);
        setText(nextText);
        onChange?.(parsed, event);
      }
    }
    onBlur?.(event);
  }

  return (
    <input
      inputMode="decimal"
      {...rest}
      min={min}
      max={max}
      step={step}
      value={text}
      onFocus={(event) => {
        focusedRef.current = true;
        rest.onFocus?.(event);
      }}
      onChange={(event) => {
        const raw = event.target.value;
        if (raw === "" || /^-?\d*(?:[.,]\d*)?$/.test(raw)) {
          emit(raw.replace(",", "."), event);
        }
      }}
      onBlur={commit}
      className={cn(
        inputFieldRingClass(isInvalid, isValid),
        "flex w-full disabled:cursor-not-allowed disabled:opacity-50",
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
    />
  );
}

function toDisplay(value) {
  if (value === "" || value == null) return "";
  if (typeof value === "number" && Number.isNaN(value)) return "";
  return String(value);
}
