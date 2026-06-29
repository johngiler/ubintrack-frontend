"use client";

import { motion } from "motion/react";
import { FileSearch, Inbox, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/bootstrap";

export default function WmsListEmptyState({
  hasFilters,
  canCreate,
  onClearFilters,
  onCreate,
  emptyTitle = "No hay registros",
  emptyDescription = "Comienza creando el primer registro.",
  filtersTitle = "No se encontraron resultados",
  filtersDescription = "Intenta ajustar tu búsqueda o filtros para encontrar lo que buscas.",
  createLabel = "Crear nuevo",
}) {
  const Icon = hasFilters ? FileSearch : Inbox;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex flex-col items-center px-4 py-12 text-center sm:py-16"
    >
      <div className="brand-icon-box mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
        <Icon className="h-8 w-8" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold text-[var(--foreground)]">
        {hasFilters ? filtersTitle : emptyTitle}
      </h3>
      <p className="mt-2 max-w-md text-sm text-[var(--foreground-muted)]">
        {hasFilters ? filtersDescription : emptyDescription}
      </p>
      {hasFilters ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          icon={RotateCcw}
          onClick={onClearFilters}
        >
          Limpiar filtros
        </Button>
      ) : canCreate ? (
        <Button variant="primary" size="sm" className="mt-5" icon={Plus} onClick={onCreate}>
          {createLabel}
        </Button>
      ) : null}
    </motion.div>
  );
}
