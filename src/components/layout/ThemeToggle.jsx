"use client";

import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/cn";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle({ className }) {
  const { isDark, toggleTheme, ready } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Modo claro" : "Modo oscuro"}
      className={cn(
        "relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[var(--surface)] text-[var(--foreground-muted)] shadow-sm ring-1 ring-[var(--border)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
        className,
      )}
    >
      {ready ? (
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Sun className="h-4 w-4" strokeWidth={2} />
            </motion.span>
          ) : (
            <motion.span
              key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Moon className="h-4 w-4" strokeWidth={2} />
            </motion.span>
          )}
        </AnimatePresence>
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2} />
      )}
    </button>
  );
}
