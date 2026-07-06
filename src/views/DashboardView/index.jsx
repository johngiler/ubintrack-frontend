"use client";

import { useCallback, useEffect, useState } from "react";
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

function formatMonthRange(start, end) {
  const fmt = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export default function DashboardView() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [clientStats, setClientStats] = useState(null);
  const [warehouseData, setWarehouseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warehouseLoading, setWarehouseLoading] = useState(true);
  const [warehouseError, setWarehouseError] = useState(null);
  const [warehouseMissing, setWarehouseMissing] = useState(false);

  const [startDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [endDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0);
  });

  const fetchWarehouse = useCallback(async () => {
    setWarehouseLoading(true);
    setWarehouseError(null);
    setWarehouseMissing(false);
    try {
      const response = await getWarehouseStructure();
      if (response.success) {
        setWarehouseData(response.data);
      } else {
        setWarehouseData(null);
        setWarehouseError(response.error || "Error al cargar el almacén");
        setWarehouseMissing(true);
      }
    } catch (error) {
      setWarehouseData(null);
      setWarehouseError(getApiErrorMessage(error, "Error al cargar el almacén"));
    } finally {
      setWarehouseLoading(false);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [stats, clients] = await Promise.all([getDashboardStats(), getClientStats()]);
      setDashboardData(stats);
      setClientStats(clients);
    } catch (error) {
      console.error("Error al cargar dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchWarehouse();
  }, [fetchDashboard, fetchWarehouse]);

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
        <div className="py-20 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando dashboard…</span>
          </div>
          <p className="mt-3 text-sm text-slate-500">Cargando datos del dashboard…</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiStatCard
              title="Entradas"
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
            loading={warehouseLoading}
            error={warehouseError}
            missingWarehouse={warehouseMissing}
            onRetry={fetchWarehouse}
          />

          <SeriesChart charts={dashboardData?.charts} />

          <ClientInventoryTable clientStats={clientStats} />
        </div>
      )}
    </div>
  );
}
