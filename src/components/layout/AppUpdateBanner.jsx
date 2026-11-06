"use client";

import { RefreshCw, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button, IconButton } from "@/components/ui/Button";
import { useAppUpdate } from "@/context/AppUpdateContext";

export function AppUpdateBanner() {
  const { updateAvailable, dismissUpdate, reloadForUpdate } = useAppUpdate();

  return (
    <AnimatePresence>
      {updateAvailable ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed bottom-4 left-4 z-[60] max-w-[min(100vw-2rem,22rem)] sm:bottom-6 sm:left-6"
        >
          <div className="pointer-events-auto overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            <div className="px-4 pb-4 pt-3.5">
              <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Actualización disponible</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[var(--foreground-muted)]">
                    Hay una versión nueva. Recarga para aplicarla.
                  </p>
                </div>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label="Cerrar aviso"
                  title="Cerrar"
                  onClick={dismissUpdate}
                >
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
              <Button icon={RefreshCw} className="w-full" onClick={reloadForUpdate}>
                Actualizar
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
