"use client";

import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getBarToneClass, getConditionBadgeVariant } from "../dashboardUtils";
import ProgressRing from "./ProgressRing";

function CavaCard({ cava, onSelect }) {
  const stats = cava.statistics || {};
  const utilization = stats.utilization_rate || 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(cava)}
      className="group w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-sky-200 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{cava.name}</h3>
        <Badge variant={getConditionBadgeVariant(cava.condition)} dot={false} className="text-[10px]">
          {cava.condition}
        </Badge>
      </div>

      <div className="mb-3 flex justify-center">
        <ProgressRing value={utilization} />
      </div>

      <div className="mb-3 space-y-1 text-center text-xs text-slate-500">
        <p className="inline-flex items-center justify-center gap-1 text-sky-700">
          <Thermometer className="h-3.5 w-3.5" />
          {cava.current_temp ?? "—"}°C
        </p>
        <p>{stats.total_positions ?? 0} posiciones</p>
      </div>

      <div className="mb-3 space-y-2">
        {(cava.halls || []).slice(0, 4).map((hall) => {
          const rate = hall.positions?.utilization_rate || 0;
          const used = (hall.positions?.ocupada || 0) + (hall.positions?.asignada || 0);
          const total = hall.positions?.total || 0;
          return (
            <div key={hall.id}>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{hall.name}</span>
                <span className="font-medium text-slate-700">
                  {used}/{total} ({Math.round(rate)}%)
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${getBarToneClass(rate)}`}
                  style={{ width: `${Math.min(100, rate)}%` }}
                />
              </div>
            </div>
          );
        })}
        {!cava.halls?.length ? (
          <p className="text-center text-[11px] text-slate-400">Sin pasillos</p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
        <div className="rounded-lg bg-red-50 px-1 py-1.5">
          <p className="font-bold text-red-600">
            {stats.total_positions
              ? Math.round((stats.ocupada_positions / stats.total_positions) * 100)
              : 0}
            %
          </p>
          <p className="text-slate-500">Ocupadas</p>
          <p className="font-medium text-slate-700">{stats.ocupada_positions ?? 0}</p>
        </div>
        <div className="rounded-lg bg-amber-50 px-1 py-1.5">
          <p className="font-bold text-amber-600">
            {stats.total_positions
              ? Math.round((stats.asignada_positions / stats.total_positions) * 100)
              : 0}
            %
          </p>
          <p className="text-slate-500">Asignadas</p>
          <p className="font-medium text-slate-700">{stats.asignada_positions ?? 0}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-1 py-1.5">
          <p className="font-bold text-emerald-600">
            {stats.total_positions
              ? Math.round((stats.libre_positions / stats.total_positions) * 100)
              : 0}
            %
          </p>
          <p className="text-slate-500">Libres</p>
          <p className="font-medium text-slate-700">{stats.libre_positions ?? 0}</p>
        </div>
      </div>

      <p className="mt-3 flex items-center justify-center gap-1 text-xs font-medium text-sky-600 opacity-0 transition-opacity group-hover:opacity-100">
        Ver pasillos
        <ChevronRight className="h-3.5 w-3.5" />
      </p>
    </button>
  );
}

function HallsView({ cava, onBack }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Pasillos — {cava.name}</h3>
          <p className="text-xs text-slate-500">
            <Thermometer className="mr-1 inline h-3.5 w-3.5" />
            {cava.current_temp ?? "—"}°C
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          Volver a cavas
        </Button>
      </div>

      {(cava.halls || []).length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(cava.halls || []).map((hall) => {
            const rate = hall.positions?.utilization_rate || 0;
            const used = (hall.positions?.ocupada || 0) + (hall.positions?.asignada || 0);
            return (
              <div
                key={hall.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h4 className="text-sm font-semibold text-sky-700">{hall.name}</h4>
                <p className="mt-1 text-xs text-slate-500">
                  {used}/{hall.positions?.total || 0} posiciones usadas
                </p>
                <div className="mt-3 flex justify-center">
                  <ProgressRing value={rate} size={56} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1 text-center text-[10px]">
                  <div>
                    <p className="font-semibold text-red-600">{hall.positions?.ocupada ?? 0}</p>
                    <p className="text-slate-500">Ocup.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-600">{hall.positions?.asignada ?? 0}</p>
                    <p className="text-slate-500">Asig.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-600">{hall.positions?.libre ?? 0}</p>
                    <p className="text-slate-500">Libre</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-slate-500">Esta cava no tiene pasillos configurados.</p>
      )}
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

  const cavas = useMemo(
    () => warehouseData?.storage?.cavas || [],
    [warehouseData],
  );

  const breadcrumb = selectedCava
    ? ["Almacén principal", selectedCava.name]
    : ["Almacén principal"];

  return (
    <Card>
      <Card.Header className="border-b border-slate-100">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-800">
          Mapa del almacén
        </h2>
      </Card.Header>
      <Card.Body className="!p-4">
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          {breadcrumb.map((crumb, index) => (
            <span key={crumb} className="inline-flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3 w-3 text-slate-300" /> : null}
              {index === 0 && !selectedCava ? (
                <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                  <Home className="h-3.5 w-3.5" />
                  {crumb}
                </span>
              ) : index === 0 && selectedCava ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-sky-600"
                  onClick={() => setSelectedCava(null)}
                >
                  <Home className="h-3.5 w-3.5" />
                  {crumb}
                </button>
              ) : (
                <span className="font-medium text-slate-700">{crumb}</span>
              )}
            </span>
          ))}
        </nav>

        {loading ? (
          <div className="py-16 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando mapa…</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">Cargando mapa del almacén…</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <AlertTriangle
              className={`mx-auto mb-3 h-10 w-10 ${missingWarehouse ? "text-amber-500" : "text-red-500"}`}
            />
            <p
              className={`text-sm font-medium ${missingWarehouse ? "text-amber-800" : "text-red-600"}`}
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
          <p className="py-12 text-center text-sm text-slate-500">No hay datos del almacén disponibles.</p>
        ) : selectedCava ? (
          <HallsView cava={selectedCava} onBack={() => setSelectedCava(null)} />
        ) : (
          <div
            className="rounded-xl border border-dashed border-slate-200 bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:20px_20px] p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {cavas.map((cava) => (
                <CavaCard key={cava.id} cava={cava} onSelect={setSelectedCava} />
              ))}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
