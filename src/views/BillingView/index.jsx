"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Calculator,
  Layers,
  Lock,
  Package,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { Alert, Card, Col, Pagination, Row, Table } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import { useTheme } from "@/context/ThemeContext";
import { useWmsNavigate } from "@/hooks/useWmsRouter";
import { getBillingClients, getBillingSummary } from "@/services/financeService";
import BillingKpiCard from "./components/BillingKpiCard";
import BillingPeriodFilter from "./components/BillingPeriodFilter";
import {
  BILLING_COLORS,
  formatBillingCurrency,
  getDefaultBillingDates,
  billingApexChartDefaults,
} from "./billingUtils";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PAGE_SIZE = 20;

export default function BillingView() {
  const navigate = useWmsNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const apexDefaults = billingApexChartDefaults(isDark);
  const searchParams = useSearchParams();
  const defaultDates = getDefaultBillingDates();

  const initialStart =
    searchParams.get("start_date") || defaultDates.start;
  const initialEnd = searchParams.get("end_date") || defaultDates.end;

  const [summary, setSummary] = useState(null);
  const [clients, setClients] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [appliedStartDate, setAppliedStartDate] = useState(initialStart);
  const [appliedEndDate, setAppliedEndDate] = useState(initialEnd);

  const showAlert = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const loadClients = useCallback(
    async (page, start, end) => {
      setIsLoadingClients(true);
      try {
        const clientsData = await getBillingClients(page, PAGE_SIZE, start, end);
        setClients(clientsData.results || []);
        setTotalItems(clientsData.count || 0);
        setTotalPages(Math.ceil((clientsData.count || 0) / PAGE_SIZE));
      } catch {
        showAlert("danger", "Error al cargar los clientes");
      } finally {
        setIsLoadingClients(false);
      }
    },
    [showAlert],
  );

  const loadData = useCallback(
    async (start, end, page = 1) => {
      setIsLoading(true);
      try {
        const [summaryData, clientsData] = await Promise.all([
          getBillingSummary(start, end),
          getBillingClients(page, PAGE_SIZE, start, end),
        ]);
        setSummary(summaryData);
        setClients(clientsData.results || []);
        setTotalItems(clientsData.count || 0);
        setTotalPages(Math.ceil((clientsData.count || 0) / PAGE_SIZE));
        setCurrentPage(page);
      } catch {
        showAlert("danger", "Error al cargar los datos de facturación");
      } finally {
        setIsLoading(false);
      }
    },
    [showAlert],
  );

  useEffect(() => {
    loadData(appliedStartDate, appliedEndDate, 1);
  }, [appliedStartDate, appliedEndDate, loadData]);

  useEffect(() => {
    if (currentPage === 1) return;
    loadClients(currentPage, appliedStartDate, appliedEndDate);
  }, [currentPage, appliedStartDate, appliedEndDate, loadClients]);

  const handleApplyFilter = () => {
    if (startDate === appliedStartDate && endDate === appliedEndDate) return;
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(1);
  };

  const handleClientClick = (clientId) => {
    navigate(
      `/finance/billing/${clientId}?start_date=${appliedStartDate}&end_date=${appliedEndDate}`,
    );
  };

  const billingDistributionChart = useMemo(
    () => ({
      series: summary
        ? [
            parseFloat(summary.total_storage_cost),
            parseFloat(summary.total_entries_cost),
            parseFloat(summary.total_exits_cost),
            parseFloat(summary.total_picking_cost),
            parseFloat(summary.total_additional_services),
          ]
        : [0, 0, 0, 0, 0],
      options: {
        chart: {
          type: "donut",
          height: 320,
          ...apexDefaults.chart,
        },
        labels: ["Almacenamiento", "Entradas", "Salidas", "Picking", "Servicios Adicionales"],
        colors: [
          BILLING_COLORS.storage,
          BILLING_COLORS.entries,
          BILLING_COLORS.exits,
          BILLING_COLORS.picking,
          BILLING_COLORS.services,
        ],
        legend: {
          position: "bottom",
          ...apexDefaults.legend,
        },
        dataLabels: {
          enabled: true,
          ...apexDefaults.dataLabels,
          formatter(_val, opts) {
            return `$${opts.w.config.series[opts.seriesIndex].toFixed(2)}`;
          },
        },
        stroke: { colors: [isDark ? "rgba(15, 23, 42, 0.6)" : "#fff"] },
        tooltip: apexDefaults.tooltip,
      },
    }),
    [summary, apexDefaults, isDark],
  );

  const topClientsChart = useMemo(
    () => ({
      series: [
        {
          name: "Facturación",
          data: summary
            ? summary.clients_summary
                .slice(0, 10)
                .map((c) => parseFloat(c.total_billing).toFixed(2))
            : [],
        },
      ],
      options: {
        chart: {
          type: "bar",
          height: 350,
          toolbar: { show: false },
          ...apexDefaults.chart,
        },
        plotOptions: {
          bar: { horizontal: true, borderRadius: 4, dataLabels: { position: "top" } },
        },
        colors: [BILLING_COLORS.storage],
        dataLabels: {
          enabled: true,
          formatter(val) {
            return `$${formatBillingCurrency(val)}`;
          },
          offsetX: 40,
          ...apexDefaults.dataLabels,
        },
        grid: apexDefaults.grid,
        xaxis: {
          ...apexDefaults.xaxis,
          categories: summary
            ? summary.clients_summary.slice(0, 10).map((c) => c.client_name)
            : [],
        },
        yaxis: apexDefaults.yaxis,
        tooltip: apexDefaults.tooltip,
      },
    }),
    [summary, apexDefaults],
  );

  const binsManaged =
    (summary?.total_bins || 0) +
    (summary?.total_entries || 0) +
    (summary?.total_exits || 0);

  return (
    <Fragment>
      {alert.show ? (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      ) : null}

      <WmsPageHeader
        title="Cálculo de facturación"
        description="Resumen de costos por almacenamiento, movimientos y servicios."
        icon={Calculator}
        breadcrumbs={[
          { title: "Finanzas", active: true },
          { title: "Calcular", active: true },
        ]}
      />

      <BillingPeriodFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApply={handleApplyFilter}
        isLoading={isLoading}
      />

      {isLoading ? (
        <div className="py-16 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-sky-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">Calculando facturación…</p>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <BillingKpiCard
              label="Total facturación"
              value={formatBillingCurrency(summary?.total_billing)}
              badge={`${summary?.total_clients || 0} clientes`}
              icon={Users}
            />
            <BillingKpiCard
              label="Almacenamiento"
              value={formatBillingCurrency(summary?.total_storage_cost)}
              badge={`${summary?.total_bins || 0} bins`}
              color={BILLING_COLORS.storage}
              icon={Package}
            />
            <BillingKpiCard
              label="Entradas"
              value={formatBillingCurrency(summary?.total_entries_cost)}
              badge={`${summary?.total_entries || 0} bins`}
              color={BILLING_COLORS.entries}
              icon={ArrowDown}
            />
            <BillingKpiCard
              label="Salidas"
              value={formatBillingCurrency(summary?.total_exits_cost)}
              badge={`${summary?.total_exits || 0} bins`}
              color={BILLING_COLORS.exits}
              icon={ArrowUp}
            />
            <BillingKpiCard
              label="Bins manejados"
              value={String(binsManaged)}
              badge="Almac + In + Out"
              color={BILLING_COLORS.bins}
              icon={Layers}
            />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BillingKpiCard
              label="Picking"
              value={formatBillingCurrency(summary?.total_picking_cost)}
              badge={`${summary?.total_picking || 0} items`}
              color={BILLING_COLORS.picking}
              icon={TrendingUp}
            />
            <BillingKpiCard
              label="Servicios"
              value={formatBillingCurrency(summary?.total_additional_services)}
              badge="Wrap, Restiba"
              color={BILLING_COLORS.services}
              icon={Wrench}
            />
            <BillingKpiCard
              label="Promedio / pallet"
              value={
                summary?.total_average_pallets > 0
                  ? formatBillingCurrency(summary.total_billing / summary.total_average_pallets)
                  : "0.00"
              }
              badge={`${summary?.total_average_pallets || 0} pallets`}
              color={BILLING_COLORS.avgPallet}
              icon={Boxes}
            />
            <BillingKpiCard
              label="Promedio / capacidad"
              value={
                summary?.total_positions > 0
                  ? formatBillingCurrency(summary.total_billing / summary.total_positions)
                  : "0.00"
              }
              badge={`${summary?.total_positions || 0} posiciones`}
              color={BILLING_COLORS.avgCapacity}
              icon={Layers}
            />
          </div>

          <Row className="mb-5">
            <Col xl={6}>
              <Card>
                <Card.Header>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-[var(--foreground)]">
                    Distribución de facturación
                  </h2>
                </Card.Header>
                <Card.Body>
                  <ReactApexChart
                    options={billingDistributionChart.options}
                    series={billingDistributionChart.series}
                    type="donut"
                    height={320}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col xl={6}>
              <Card>
                <Card.Header>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-[var(--foreground)]">
                    Top 10 clientes por facturación
                  </h2>
                </Card.Header>
                <Card.Body>
                  <ReactApexChart
                    options={topClientsChart.options}
                    series={topClientsChart.series}
                    type="bar"
                    height={350}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card>
            <Card.Header>
              <h2 className="text-sm font-semibold text-slate-800">Clientes</h2>
            </Card.Header>
            <Card.Body className="relative !p-0">
              {isLoadingClients ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <Table
                  hover
                  responsive
                  className="mb-0 [&_tbody_td:first-child]:pl-6 [&_thead_th:first-child]:pl-6"
                >
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th className="text-end">Almacenamiento</th>
                      <th className="text-end">Entradas</th>
                      <th className="text-end">Salidas</th>
                      <th className="text-end">
                        <small className="block text-slate-400">Mes anterior</small>
                        $/Pallet
                      </th>
                      <th className="text-end">
                        <small className="block text-slate-400">Mes actual</small>
                        $/Pallet
                      </th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr key={client.client_id}>
                        <td>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800">{client.client_name}</span>
                            <Badge
                              variant={client.tariff_type === "static" ? "warning" : "success"}
                              dot={false}
                            >
                              {client.tariff_type === "static" ? (
                                <>
                                  <Lock className="mr-1 inline h-3 w-3" />
                                  ESTÁTICA
                                </>
                              ) : (
                                <>
                                  <Zap className="mr-1 inline h-3 w-3" />
                                  DINÁMICA
                                </>
                              )}
                            </Badge>
                          </div>
                        </td>
                        <td className="text-end">
                          <Badge variant="info">${formatBillingCurrency(client.storage_cost)}</Badge>
                          <div className="mt-1 text-xs text-slate-500">{client.bins_count} bins</div>
                        </td>
                        <td className="text-end">
                          {parseFloat(client.entries_cost || 0) > 0 ? (
                            <>
                              <Badge variant="primary">
                                ${formatBillingCurrency(client.entries_cost || 0)}
                              </Badge>
                              <div className="mt-1 text-xs text-slate-500">
                                {client.entries_count || 0} bins
                              </div>
                            </>
                          ) : (
                            <span className="text-xs italic text-slate-400">Sin entradas</span>
                          )}
                        </td>
                        <td className="text-end">
                          {parseFloat(client.exits_cost || 0) > 0 ? (
                            <>
                              <Badge variant="success">
                                ${formatBillingCurrency(client.exits_cost || 0)}
                              </Badge>
                              <div className="mt-1 text-xs text-slate-500">
                                {client.exits_count || 0} bins
                              </div>
                            </>
                          ) : (
                            <span className="text-xs italic text-slate-400">Sin salidas</span>
                          )}
                        </td>
                        <td className="text-end text-slate-500">
                          ${(client.prev_cost_per_pallet || 0).toFixed(2)}
                        </td>
                        <td className="text-end">
                          <span className="font-semibold text-slate-900">
                            ${(client.cost_per_pallet || 0).toFixed(2)}
                          </span>
                          {client.variation_pct !== 0 ? (
                            <div
                              className={`text-xs ${client.variation_pct > 0 ? "text-emerald-600" : "text-red-600"}`}
                            >
                              {client.variation_pct > 0 ? "↑" : "↓"}
                              {Math.abs(client.variation_pct || 0).toFixed(1)}%
                            </div>
                          ) : null}
                        </td>
                        <td className="text-center">
                          <IconButton
                            size="sm"
                            className="text-sky-600 hover:bg-sky-50"
                            title="Ver detalle"
                            onClick={() => handleClientClick(client.client_id)}
                          >
                            <Calculator className="h-4 w-4" />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No hay clientes disponibles
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
            <Card.Footer className="flex flex-wrap items-center justify-between gap-3">
              <p className="mb-0 text-sm text-slate-600">
                Mostrando del <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong> al{" "}
                <strong>{Math.min(currentPage * PAGE_SIZE, totalItems)}</strong> de{" "}
                <strong>{totalItems}</strong> registros
              </p>
              <Pagination className="mb-0">
                <Pagination.Prev
                  disabled={currentPage === 1 || isLoadingClients}
                  onClick={() => setCurrentPage((p) => p - 1)}
                />
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <Pagination.Item
                      key={pageNum}
                      active={currentPage === pageNum}
                      disabled={isLoadingClients}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Pagination.Item>
                  );
                })}
                <Pagination.Next
                  disabled={currentPage === totalPages || isLoadingClients || totalPages === 0}
                  onClick={() => setCurrentPage((p) => p + 1)}
                />
              </Pagination>
            </Card.Footer>
          </Card>
        </>
      )}
    </Fragment>
  );
}
