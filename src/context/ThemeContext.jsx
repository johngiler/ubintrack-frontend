"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ubintrack-theme";

const ThemeContext = createContext(undefined);

function applyThemeClass(theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const initial =
        stored === "dark" || stored === "light"
          ? stored
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      setThemeState(initial);
      applyThemeClass(initial);
    } catch {
      applyThemeClass("light");
    } finally {
      setReady(true);
    }
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    applyThemeClass(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      applyThemeClass(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      ready,
      setTheme,
      toggleTheme,
    }),
    [theme, ready, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
