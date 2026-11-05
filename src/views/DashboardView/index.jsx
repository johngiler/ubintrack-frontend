"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Calendar,
  LayoutDashboard,
  MapPin,
  Upload,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/bootstrap";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import { swrKeys } from "@/lib/swr";
import {
  getClientStats,
  getDashboardStats,
  getWarehouseStructure,
} from "@/services/dashboardService";
import { getApiErrorMessage } from "@/services/httpClient";
import KpiStatCard from "./components/KpiStatCard";
import WarehouseMapSection from "./components/WarehouseMapSection";
import SeriesChart from "./components/SeriesChart";
import ClientInventoryTable from "./components/ClientInventoryTable";
import DashboardViewSkeleton from "./DashboardViewSkeleton";

function formatMonthRange(start, end) {
  const fmt = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

async function fetchWarehouse() {
  const response = await getWarehouseStructure();
  if (response.success) {
    return { data: response.data, missing: false, error: null };
  }
  return {
    data: null,
    missing: true,
    error: response.error || "Error al cargar el almacén",
  };
}

export default function DashboardView() {
  const { user } = useAuth();

  const [startDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [endDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0);
  });

  const {
    data: dashboardData,
    isLoading: statsLoading,
  } = useSWR(swrKeys.dashboardStats, getDashboardStats, {
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  });

  const { data: clientStats } = useSWR(swrKeys.dashboardClients, getClientStats, {
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  });

  const {
    data: warehousePayload,
    error: warehouseFetchError,
    isLoading: warehouseLoading,
    mutate: retryWarehouse,
  } = useSWR(swrKeys.dashboardWarehouse, fetchWarehouse, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const warehouseData = warehousePayload?.data ?? null;
  const warehouseMissing = Boolean(warehousePayload?.missing);
  const warehouseError =
    warehousePayload?.error ||
    (warehouseFetchError
      ? getApiErrorMessage(warehouseFetchError, "Error al cargar el almacén")
      : null);

  const loading = statsLoading && !dashboardData;
  const stats = dashboardData?.stats;
  const positions = stats?.positions;
  const displayName = user?.full_name || user?.email || "Usuario";

  return (
    <div>
      <WmsPageHeader
        title={`Hola, ${displayName}`}
        description={
          dashboardData?.timestamp
            ? `Última actualización: ${new Date(dashboardData.timestamp).toLocaleString("es-ES")}`
            : undefined
        }
        icon={LayoutDashboard}
        breadcrumbs={[{ title: "Dashboard", active: true }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-[var(--border-subtle)] dark:bg-[var(--surface)] dark:text-[var(--foreground-muted)]">
              <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              {formatMonthRange(startDate, endDate)}
            </div>
            <Button variant="secondary" size="sm" icon={Upload}>
              Exportar informe
            </Button>
          </div>
        }
      />

      {loading ? (
        <DashboardViewSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiStatCard
              title="Entradas"
              href="/order/entries"
              total={stats?.entries?.total_count}
              icon={ArrowDownToLine}
              iconTone="sky"
              breakdown={[
                { label: "Pendientes", value: stats?.entries?.pending_count, tone: "sky" },
                { label: "En progreso", value: stats?.entries?.in_progress_count, tone: "amber" },
                { label: "Completadas", value: stats?.entries?.completed_count, tone: "emerald" },
              ]}
            />
            <KpiStatCard
              title="Bins"
              href="/inventory/bins"
              total={stats?.bins?.total_count}
              icon={Boxes}
              iconTone="slate"
              breakdown={[
                { label: "Recibidos", value: stats?.bins?.received_count, tone: "sky" },
                { label: "Almacenados", value: stats?.bins?.stored_count, tone: "amber" },
                { label: "Despachados", value: stats?.bins?.dispatched_count, tone: "emerald" },
              ]}
            />
            <KpiStatCard
              title="Salidas"
              href="/order/exits"
              total={stats?.exits?.total_count}
              icon={ArrowUpFromLine}
              iconTone="emerald"
              breakdown={[
                { label: "Pendientes", value: stats?.exits?.pending_count, tone: "sky" },
                { label: "En progreso", value: stats?.exits?.in_progress_count, tone: "amber" },
                { label: "Completadas", value: stats?.exits?.completed_count, tone: "emerald" },
              ]}
            />
            <KpiStatCard
              title="Posiciones"
              href="/storage/positions"
              total={positions?.total_count}
              icon={MapPin}
              iconTone="violet"
              ringValue={positions?.total_percentage}
              breakdown={[
                {
                  label: "Ocupadas",
                  value: `${Math.round(positions?.occupied_percentage || 0)}%`,
                  subValue: positions?.occupied_count,
                  tone: "red",
                },
                {
                  label: "Asignadas",
                  value: `${Math.round(positions?.assigned_percentage || 0)}%`,
                  subValue: positions?.assigned_count,
                  tone: "orange",
                },
                {
                  label: "Libres",
                  value: `${Math.round(positions?.free_percentage || 0)}%`,
                  subValue: positions?.free_count,
                  tone: "emerald",
                },
              ]}
            />
          </div>

          <WarehouseMapSection
            warehouseData={warehouseData}
            loading={warehouseLoading && !warehousePayload}
            error={warehouseError}
            missingWarehouse={warehouseMissing}
            onRetry={() => retryWarehouse()}
          />

          <SeriesChart charts={dashboardData?.charts} />

          <ClientInventoryTable clientStats={clientStats} />
        </div>
      )}
    </div>
  );
}
