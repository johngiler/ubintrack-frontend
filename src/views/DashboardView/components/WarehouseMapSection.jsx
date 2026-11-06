"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Home,
  Plus,
  RefreshCw,
  Thermometer,
} from "lucide-react";

import { Button } from "@/components/ui/bootstrap";
import Skeleton from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { getPositionNomenclature } from "@/services/storageService";
import { cavaTitleOf } from "@/views/CavasView/cavaPlan";
import CavaPlan from "@/views/CavasView/components/CavaPlan";
import { getConditionBadgeVariant } from "../dashboardUtils";

function blocksOf(cava) {
  return (cava.blocks || []).map((block) => ({
    key: block.id ? `id-${block.id}` : `${block.kind}-${block.code}`,
    kind: block.kind,
    code: block.code || "",
    rack_count: block.rack_count || 1,
    levels: block.levels || "",
    depth: block.depth || "",
    orientation: block.orientation === "vertical" ? "vertical" : "horizontal",
    label_side: block.label_side === "above" ? "above" : "below",
    aisle_code: block.aisle_code || "",
  }));
}

function shareOf(part, total) {
  if (!total) return 0;
  return Math.max(0, (part / total) * 100);
}

function CavaSummaryCard({ cava, onSelect }) {
  const stats = cava.statistics || {};
  const total = stats.total_positions || 0;
  const libre = stats.libre_positions || 0;
  const asignada = stats.asignada_positions || 0;
  const ocupada = stats.ocupada_positions || 0;
  const inactiva = stats.inactiva_positions || 0;
  const libreShare = shareOf(libre, total);
  const asignadaShare = shareOf(asignada, total);
  const ocupadaShare = shareOf(ocupada, total);
  const inactivaShare = shareOf(inactiva, total);

  return (
    <button
      type="button"
      onClick={() => onSelect(cava)}
      className="flex w-full cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-sky-200 hover:bg-sky-50/40 dark:border-[var(--border-subtle)] dark:bg-[var(--surface)] dark:hover:border-sky-500/40 dark:hover:bg-sky-500/5"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-[var(--foreground)]">
          {cavaTitleOf(cava.name, cava.code)}
        </h3>
        <Badge variant={getConditionBadgeVariant(cava.condition)} dot={false} className="text-[10px]">
          {cava.condition}
        </Badge>
      </div>

      <p className="mb-3 inline-flex items-center gap-1 text-xs text-sky-700 dark:text-sky-400">
        <Thermometer className="h-3.5 w-3.5" />
        {cava.current_temp ?? "—"}°C
        <span className="text-slate-400 dark:text-slate-500">·</span>
        <span className="text-slate-500 dark:text-[var(--foreground-muted)]">{total} posiciones</span>
      </p>

      <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700/60">
        {libreShare > 0 ? <div className="h-full bg-emerald-500" style={{ width: `${libreShare}%` }} /> : null}
        {asignadaShare > 0 ? <div className="h-full bg-orange-500" style={{ width: `${asignadaShare}%` }} /> : null}
        {ocupadaShare > 0 ? <div className="h-full bg-red-500" style={{ width: `${ocupadaShare}%` }} /> : null}
        {inactivaShare > 0 ? <div className="h-full bg-slate-400" style={{ width: `${inactivaShare}%` }} /> : null}
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
        <div>
          <p className="font-semibold text-emerald-600 dark:text-emerald-400">{libre}</p>
          <p className="text-slate-500 dark:text-[var(--foreground-muted)]">Libres</p>
        </div>
        <div>
          <p className="font-semibold text-orange-600 dark:text-orange-400">{asignada}</p>
          <p className="text-slate-500 dark:text-[var(--foreground-muted)]">Asignadas</p>
        </div>
        <div>
          <p className="font-semibold text-red-600 dark:text-red-400">{ocupada}</p>
          <p className="text-slate-500 dark:text-[var(--foreground-muted)]">Ocupadas</p>
        </div>
        <div>
          <p className="font-semibold text-slate-500 dark:text-slate-400">{inactiva}</p>
          <p className="text-slate-500 dark:text-[var(--foreground-muted)]">Inactivas</p>
        </div>
      </div>

      <p className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-sky-600 dark:text-sky-400">
        Ver mapa
        <ChevronRight className="h-3.5 w-3.5" />
      </p>
    </button>
  );
}

function CavaHeatmapModal({ cava, nomenclature, onHide }) {
  return (
    <Modal show={Boolean(cava)} onHide={onHide} size="xl" className="max-w-[1103px]">
      {cava ? (
        <>
          <Modal.Header>
            <Modal.Title>{cavaTitleOf(cava.name, cava.code)}</Modal.Title>
            <Modal.Subtitle>
              <span className="inline-flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5" />
                {cava.current_temp ?? "—"}°C
                {cava.condition ? ` · ${cava.condition}` : ""}
              </span>
            </Modal.Subtitle>
          </Modal.Header>
          <Modal.Body>
            <CavaPlan
              cavaId={cava.id}
              name={cava.name}
              code={cava.code}
              blocks={blocksOf(cava)}
              nomenclature={nomenclature}
              readOnly
              showTitle={false}
            />
          </Modal.Body>
        </>
      ) : null}
    </Modal>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: 3 }).map((_, card) => (
        <div
          key={card}
          className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border-subtle)] dark:bg-[var(--surface)]"
        >
          <div className="mb-3 flex items-start justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mb-3 h-3 w-32" />
          <Skeleton className="mb-3 h-2 w-full rounded-full" />
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="mx-auto h-8 w-8" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WarehouseMapSection({
  warehouseData,
  loading,
  error,
  missingWarehouse = false,
  onRetry,
}) {
  const router = useRouter();
  const [selectedCava, setSelectedCava] = useState(null);
  const [nomenclature, setNomenclature] = useState(null);

  const cavas = useMemo(
    () => warehouseData?.storage?.cavas || [],
    [warehouseData],
  );
  const storageName = warehouseData?.storage?.name || "Almacén";

  useEffect(() => {
    if (!selectedCava) return undefined;
    let cancelled = false;
    getPositionNomenclature()
      .then((data) => {
        if (!cancelled) setNomenclature(data);
      })
      .catch(() => {
        if (!cancelled) setNomenclature(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCava]);

  return (
    <Card>
      <Card.Header className="border-b border-slate-100 dark:border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-[var(--foreground)]">
          Mapa del almacén
        </h2>
      </Card.Header>
      <Card.Body className="!p-4">
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-[var(--foreground-muted)]">
          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
            <Home className="h-3.5 w-3.5" />
            {storageName}
          </span>
        </nav>

        {loading ? (
          <SummarySkeleton />
        ) : error ? (
          <div className="py-12 text-center">
            <AlertTriangle
              className={`mx-auto mb-3 h-10 w-10 ${missingWarehouse ? "text-amber-500" : "text-red-500"}`}
            />
            <p
              className={`text-sm font-medium ${missingWarehouse ? "text-amber-800 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}
            >
              {error}
            </p>
            {missingWarehouse ? (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => router.push("/storage/storages?new=1")}
                >
                  Crear bodega
                </Button>
                <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" icon={RefreshCw} className="mt-4" onClick={onRetry}>
                Reintentar
              </Button>
            )}
          </div>
        ) : !cavas.length ? (
          <p className="py-12 text-center text-sm text-slate-500 dark:text-[var(--foreground-muted)]">
            No hay datos del almacén disponibles.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cavas.map((cava) => (
              <CavaSummaryCard key={cava.id} cava={cava} onSelect={setSelectedCava} />
            ))}
          </div>
        )}
        <CavaHeatmapModal
          cava={selectedCava}
          nomenclature={nomenclature}
          onHide={() => setSelectedCava(null)}
        />
      </Card.Body>
    </Card>
  );
}
