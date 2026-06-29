"use client";

import { createContext, useContext, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/Button";

const ModalContext = createContext({ onHide: null });

export function Modal({ show, onHide, children, size = "lg", className, centered }) {
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (typeof document === "undefined") return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[min(96vw,75rem)]",
  };

  const sizeClass = sizes[size] || sizes.lg;

  return createPortal(
    <AnimatePresence>
      {show ? (
        <ModalContext.Provider value={{ onHide }}>
          <div
            className={cn(
              "fixed inset-0 z-50 flex justify-center p-4",
              centered !== false ? "items-center" : "items-end sm:items-center",
            )}
          >
            <motion.button
              type="button"
              aria-label="Cerrar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 cursor-pointer bg-slate-900/50 backdrop-blur-[2px] dark:bg-black/60"
              onClick={onHide}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={cn(
                "relative z-10 flex max-h-[min(92dvh,900px)] w-full flex-col overflow-hidden rounded-2xl bg-[var(--card)] shadow-2xl ring-1 ring-[var(--border)]",
                sizeClass,
                className,
              )}
            >
              {children}
            </motion.div>
          </div>
        </ModalContext.Provider>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

Modal.Header = function ModalHeader({ children, closeButton = true, onHide, className }) {
  const ctx = useContext(ModalContext);
  const hide = onHide || ctx.onHide;
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {closeButton && hide ? (
        <IconButton variant="ghost" size="sm" onClick={hide} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </IconButton>
      ) : null}
    </div>
  );
};

Modal.Title = function ModalTitle({ children, className }) {
  return (
    <h2 className={cn("text-lg font-semibold text-[var(--foreground)]", className)}>{children}</h2>
  );
};

Modal.Subtitle = function ModalSubtitle({ children, className }) {
  return <p className={cn("mt-1 text-sm text-[var(--foreground-muted)]", className)}>{children}</p>;
};

Modal.Body = function ModalBody({ children, className }) {
  return <div className={cn("flex-1 overflow-y-auto px-5 py-4", className)}>{children}</div>;
};

Modal.Footer = function ModalFooter({ children, className }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-hover)]/40 px-5 py-3",
        className,
      )}
    >
      {children}
    </div>
  );
};

Modal.Section = function ModalSection({ title, children, className }) {
  return (
    <section
      className={cn(
        "mb-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-hover)]/30 p-4 last:mb-0",
        className,
      )}
    >
      {title ? (
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
};
