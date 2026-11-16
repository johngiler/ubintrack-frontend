"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Play } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { TASK_STATUS_LABELS, TASK_STATUS_VARIANTS } from "../taskLabels";

const MENU_MIN_W = 168;

function buildActions(task, advanceReady) {
  if (["pendiente", "asignada"].includes(task.status)) {
    return [
      {
        status: "en_proceso",
        label: "Iniciar",
        icon: Play,
      },
    ];
  }
  if (task.status === "en_proceso") {
    return [
      {
        status: task.require_approval ? "verificacion" : "completada",
        label: task.require_approval ? "A verificación" : "Completar",
        icon: Check,
        disabled: !advanceReady,
        title: advanceReady ? undefined : "Faltan líneas por resolver",
      },
    ];
  }
  if (task.status === "verificacion") {
    return [
      {
        status: "completada",
        label: "Completar",
        icon: Check,
      },
    ];
  }
  return [];
}

function menuPosition(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const width = MENU_MIN_W;
  let left = rect.left;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  const top = rect.bottom + 6;
  return { top, left, width };
}

export default function TaskStatusMenu({
  task,
  canChange = false,
  advanceReady = false,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const actions = canChange ? buildActions(task, advanceReady) : [];
  const interactive = actions.length > 0;
  const variant = TASK_STATUS_VARIANTS[task.status] || "secondary";
  const label = TASK_STATUS_LABELS[task.status] || task.status;

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    const el = triggerRef.current;
    if (!el) return undefined;
    const sync = () => {
      if (!el.isConnected) {
        setOpen(false);
        return;
      }
      setCoords(menuPosition(el));
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!interactive) {
    return (
      <Badge variant={variant} dot={false}>
        {label}
      </Badge>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Cambiar estado: ${label}`}
        className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        onClick={() => setOpen((v) => !v)}
      >
        <Badge variant={variant} dot={false} className="gap-1 pr-1.5">
          {label}
          <ChevronDown
            className={cn(
              "h-3 w-3 shrink-0 opacity-70 transition-transform",
              open && "rotate-180",
            )}
          />
        </Badge>
      </button>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open && coords ? (
                <motion.div
                  ref={menuRef}
                  role="menu"
                  data-task-status-menu
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    position: "fixed",
                    top: coords.top,
                    left: coords.left,
                    width: coords.width,
                    zIndex: 70,
                  }}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
                >
                  {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.status}
                        type="button"
                        role="menuitem"
                        disabled={Boolean(action.disabled)}
                        title={action.title}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50",
                          action.disabled &&
                            "cursor-not-allowed opacity-50 hover:bg-transparent",
                        )}
                        onClick={() => {
                          if (action.disabled) return;
                          setOpen(false);
                          onChange?.(action.status);
                        }}
                      >
                        {Icon ? (
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                        ) : null}
                        {action.label}
                      </button>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
