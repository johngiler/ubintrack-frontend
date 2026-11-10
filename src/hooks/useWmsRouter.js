"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Adaptador de react-router useSearchParams para módulos migrados. */
export function useWmsSearchParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = useCallback(
    (next) => {
      const resolved =
        typeof next === "function"
          ? next(new URLSearchParams(searchParams.toString()))
          : next;

      let qs = "";
      if (resolved instanceof URLSearchParams) {
        qs = resolved.toString();
      } else if (resolved && typeof resolved === "object") {
        // Plain object (p. ej. {}): no usar Object#toString → "[object Object]".
        const params = new URLSearchParams();
        Object.entries(resolved).forEach(([key, value]) => {
          if (value == null || value === "") return;
          params.set(key, String(value));
        });
        qs = params.toString();
      } else if (resolved != null) {
        qs = String(resolved);
      }

      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const adapter = {
    get: (key) => searchParams.get(key),
    toString: () => searchParams.toString(),
    set: (key, value) => {
      const p = new URLSearchParams(searchParams.toString());
      if (value == null || value === "") p.delete(key);
      else p.set(key, value);
      setSearchParams(p);
    },
  };

  return [adapter, setSearchParams];
}

export function useWmsNavigate() {
  return useRouter().push;
}

export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
