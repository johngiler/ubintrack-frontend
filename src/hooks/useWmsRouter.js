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
      const params = typeof next === "function" ? next(new URLSearchParams(searchParams.toString())) : next;
      const qs = params?.toString?.() ?? String(params || "");
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
