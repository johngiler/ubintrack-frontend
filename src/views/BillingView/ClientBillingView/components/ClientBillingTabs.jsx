"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Box,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  HandCoins,
  History,
  LayoutDashboard,
  Lock,
  RefreshCw,
  Wrench,
} from "lucide-react";

import { Alert, Badge, Button, Card, Col, Row, Table } from "@/components/ui/bootstrap";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import {
  exportInventoryAverageExcel,
  getInventoryAverage,
} from "@/services/financeService";
import { BILLING_COLORS, downloadBlob, formatBillingCurrency } from "../../billingUtils";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const TABS = [
  { key: "overview", label: "Resumen", icon: LayoutDashboard },
  { key: "storage", label: "Almacenamiento", icon: Box },
  { key: "movements", label: "Movimientos", icon: RefreshCw },
  { key: "picking", label: "Picking", icon: HandCoins },
  { key: "services", label: "Servicios", icon: Wrench },
  { key: "history", label: "Historial", icon: History },
  { key: "average", label: "Promedio diario", icon: BarChart3 },
];

function CostBadge({ value, color }) {
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      ${formatBillingCurrency(value)}
    </span>
  );
}

export default function ClientBillingTabs({
  billingData,
  historyData,
  clientId,
  appliedStartDate,
  appliedEndDate,
  showAlert,
}) {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [averageData, setAverageData] = useState(null);
  const [storageType, setStorageType] = useState("all");
  const [isLoadingAverage, setIsLoadingAverage] = useState(false);
  const [showDailyData, setShowDailyData] = useState(true);

  const loadAverageData = async () => {
    setIsLoadingAverage(true);
    try {
      const data = await getInventoryAverage(
        clientId,
        appliedStartDate,
        appliedEndDate,
        storageType,
      );
      setAverageData(data);
    } catch {
      showAlert("danger", "Error al calcular el promedio de inventario");
    } finally {
      setIsLoadingAverage(false);
    }
  };

  const handleExportAverage = async () => {
    if (!averageData) {
      showAlert("warning", "Primero calcule los promedios");
      return;
    }
    try {
      const blob = await exportInventoryAverageExcel(
        clientId,
        appliedStartDate,
        appliedEndDate,
        storageType,
      );
      downloadBlob(
        blob,
        `promedios_${averageData.client_name}_${appliedStartDate}_${appliedEndDate}.xls`.replace(
          / /g,
          "_",
        ),
      );
      showAlert("success", "Archivo exportado correctamente");
    } catch {
      showAlert("danger", "Error al exportar el archivo");
    }
  };

  const billingBreakdownChart = useMemo(() => {
    if (!billingData) return null;
    return {
      series: [
        parseFloat(billingData.storage.total_cost),
        parseFloat(billingData.entries.total_cost),
        parseFloat(billingData.exits.total_cost),
        parseFloat(billingData.picking.total_cost),
        parseFloat(billingData.additional_services.total_cost),
      ],
      options: {
        chart: { type: "pie", height: 320 },
        labels: ["Almacenamiento", "Entradas", "Salidas", "Picking", "Servicios"],
        colors: [
          BILLING_COLORS.storage,
          BILLING_COLORS.entries,
          BILLING_COLORS.exits,
          BILLING_COLORS.picking,
          BILLING_COLORS.services,
        ],
        legend: { position: "bottom" },
      },
    };
  }, [billingData]);

  const storageConditionChart = useMemo(() => {
    if (!billingData) return null;
    return {
      series: [
        {
          name: "Costo",
          data: [
            parseFloat(billingData.storage.refrigerated.cost),
            parseFloat(billingData.storage.frozen.cost),
          ],
        },
      ],
      options: {
        chart: { type: "bar", height: 250, toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 4, horizontal: true } },
        colors: [BILLING_COLORS.storage],
        dataLabels: {
          enabled: true,
          formatter: (val) => `$${formatBillingCurrency(val)}`,
          offsetX: 50,
        },
        xaxis: { categories: ["Refrigerado", "Congelado"] },
      },
    };
  }, [billingData]);

  const monthlyHistoryChart = useMemo(() => {
    if (!historyData) return null;
    return {
      series: [
        { name: "Almacenamiento", data: historyData.months.map((m) => m.storage_cost) },
        { name: "Entradas", data: historyData.months.map((m) => m.entries_cost) },
        { name: "Salidas", data: historyData.months.map((m) => m.exits_cost) },
        { name: "Picking", data: historyData.months.map((m) => m.picking_cost) },
        { name: "Servicios", data: historyData.months.map((m) => m.services_cost) },
      ],
      options: {
        chart: { type: "area", height: 350, stacked: true, toolbar: { show: false } },
        colors: [
          BILLING_COLORS.storage,
          BILLING_COLORS.entries,
          BILLING_COLORS.exits,
          BILLING_COLORS.picking,
          BILLING_COLORS.services,
        ],
        stroke: { curve: "smooth", width: 2 },
        xaxis: {
          categories: historyData.months.map((m) => {
            const date = new Date(`${m.month}-01`);
            return date.toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
          }),
        },
        yaxis: { labels: { formatter: (val) => `$${formatBillingCurrency(val)}` } },
        legend: { position: "top" },
      },
    };
  }, [historyData]);

  const averageChartConfig = useMemo(() => {
    if (!averageData?.daily_data) return null;
    return {
      series: [{ name: "Pallets", data: averageData.daily_data.map((d) => d.bins_count) }],
      options: {
        chart: { height: 350, type: "area", toolbar: { show: true } },
        colors: [BILLING_COLORS.entries],
        stroke: { curve: "smooth", width: 3 },
        xaxis: {
          categories: averageData.daily_data.map((d) => d.date),
          labels: { rotate: -45 },
        },
        yaxis: { min: 0 },
        annotations: {
          yaxis: [
            {
              y: averageData.average_bins,
              borderColor: "#dc3545",
              label: {
                text: `Promedio: ${Math.round(averageData.average_bins)}`,
                style: { color: "#fff", background: "#dc3545" },
              },
            },
          ],
        },
      },
    };
  }, [averageData]);

  const renderOverview = () => (
    <Row>
      <Col xl={6}>
        <h6 className="mb-3 font-semibold text-slate-800">Distribución de costos</h6>
        {billingBreakdownChart ? (
          <ReactApexChart
            options={billingBreakdownChart.options}
            series={billingBreakdownChart.series}
            type="pie"
            height={320}
          />
        ) : null}
      </Col>
      <Col xl={6}>
        <h6 className="mb-3 font-semibold text-slate-800">Costo por condición</h6>
        {storageConditionChart ? (
          <ReactApexChart
            options={storageConditionChart.options}
            series={storageConditionChart.series}
            type="bar"
            height={200}
          />
        ) : null}
        <div className="mt-4">
          <h6 className="mb-3 font-semibold text-slate-800">Resumen detallado</h6>
          <Table size="sm">
            <tbody>
              <tr>
                <td>Refrigerado</td>
                <td className="text-end text-slate-500">{billingData.storage.refrigerated.bins} bins</td>
                <td className="text-end font-semibold">
                  ${formatBillingCurrency(billingData.storage.refrigerated.cost)}
                </td>
              </tr>
              <tr>
                <td>Congelado</td>
                <td className="text-end text-slate-500">{billingData.storage.frozen.bins} bins</td>
                <td className="text-end font-semibold">
                  ${formatBillingCurrency(billingData.storage.frozen.cost)}
                </td>
              </tr>
              <tr>
                <td>Entradas (pallet)</td>
                <td className="text-end text-slate-500">{billingData.entries.pallet.count}</td>
                <td className="text-end font-semibold">
                  ${formatBillingCurrency(billingData.entries.pallet.cost)}
                </td>
              </tr>
              <tr>
                <td>Entradas (piso)</td>
                <td className="text-end text-slate-500">{billingData.entries.floor.count}</td>
                <td className="text-end font-semibold">
                  ${formatBillingCurrency(billingData.entries.floor.cost)}
                </td>
              </tr>
              <tr>
                <td>Salidas</td>
                <td className="text-end text-slate-500">{billingData.exits.count} bins</td>
                <td className="text-end font-semibold">
                  ${formatBillingCurrency(billingData.exits.total_cost)}
                </td>
              </tr>
              <tr>
                <td>Picking</td>
                <td className="text-end text-slate-500">{billingData.picking.count} items</td>
                <td className="text-end font-semibold">
                  ${formatBillingCurrency(billingData.picking.total_cost)}
                </td>
              </tr>
              <tr>
                <td>Servicios</td>
                <td className="text-end text-slate-500">Wrap, Restiba</td>
                <td className="text-end font-semibold">
                  ${formatBillingCurrency(billingData.additional_services.total_cost)}
                </td>
              </tr>
              <tr className="bg-slate-900 text-white">
                <td className="font-bold">TOTAL</td>
                <td />
                <td className="text-end font-bold">
                  ${formatBillingCurrency(billingData.total_billing)}
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </Col>
    </Row>
  );

  const renderStorage = () => (
    <>
      <h6 className="mb-3 font-semibold text-slate-800">
        Detalle de bins en almacenamiento ({billingData.storage.bins_count})
      </h6>
      <div className="max-h-[500px] overflow-auto">
        <Table hover size="sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              <th>Código bin</th>
              <th>Estado</th>
              <th>Condición</th>
              <th className="text-end">Costo</th>
              <th>Creado</th>
              <th>Despachado</th>
            </tr>
          </thead>
          <tbody>
            {billingData.storage.bins_detail.map((bin) => (
              <tr key={bin.code}>
                <td>
                  <Badge variant="dark" dot={false}>
                    {bin.code}
                  </Badge>
                </td>
                <td>
                  <Badge variant={bin.status === "ALMACENADO" ? "success" : "secondary"} dot={false}>
                    {bin.status}
                  </Badge>
                </td>
                <td>
                  <Badge variant={bin.condition === "Refrigerado" ? "info" : "primary"} dot={false}>
                    {bin.condition}
                  </Badge>
                </td>
                <td className="text-end font-semibold">${formatBillingCurrency(bin.cost)}</td>
                <td>{formatDate(bin.created_at)}</td>
                <td>{bin.dispatched_date ? formatDate(bin.dispatched_date) : "—"}</td>
              </tr>
            ))}
            {billingData.storage.bins_detail.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No hay bins registrados
                </td>
              </tr>
            ) : null}
          </tbody>
        </Table>
      </div>
    </>
  );

  const renderMovements = () => (
    <>
      {billingData.tariff_type === "static" ? (
        <Alert variant="warning" className="mb-4 text-sm">
          <Lock className="mr-2 inline h-4 w-4" />
          Tarifa estática: entradas/salidas se calculan sobre el promedio de pallets (
          {Math.round(billingData.average_pallets)}) con penalización, no sobre movimientos reales.
        </Alert>
      ) : null}
      <Row>
        <Col md={6}>
          <Card className="h-full border-0" style={{ backgroundColor: `${BILLING_COLORS.entries}10` }}>
            <Card.Body className="text-center">
              <ArrowDown className="mx-auto mb-3 h-10 w-10" style={{ color: BILLING_COLORS.entries }} />
              <p className="text-sm text-slate-500">
                {billingData.tariff_type === "static" ? "Pallets (promedio × 80%)" : "Bins creados"}
              </p>
              <p className="text-3xl font-bold" style={{ color: BILLING_COLORS.entries }}>
                {billingData.entries.count}
              </p>
              <p className="text-xl font-bold" style={{ color: BILLING_COLORS.entries }}>
                ${formatBillingCurrency(billingData.entries.total_cost)}
              </p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-full border-0" style={{ backgroundColor: `${BILLING_COLORS.exits}10` }}>
            <Card.Body className="text-center">
              <ArrowUp className="mx-auto mb-3 h-10 w-10" style={{ color: BILLING_COLORS.exits }} />
              <p className="text-sm text-slate-500">
                {billingData.tariff_type === "static" ? "Pallets (promedio × 80%)" : "Bins despachados"}
              </p>
              <p className="text-3xl font-bold" style={{ color: BILLING_COLORS.exits }}>
                {billingData.exits.count}
              </p>
              <p className="text-xl font-bold" style={{ color: BILLING_COLORS.exits }}>
                ${formatBillingCurrency(billingData.exits.total_cost)}
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );

  const renderPicking = () =>
    billingData.tariff_type === "static" ? (
      <div className="py-10 text-center">
        <p className="text-lg font-semibold text-red-600">Picking no aplica</p>
        <p className="text-slate-500">En tarifa estática no se cobra picking.</p>
      </div>
    ) : (
      <div className="py-10 text-center">
        <HandCoins className="mx-auto mb-4 h-12 w-12" style={{ color: BILLING_COLORS.picking }} />
        <p className="text-4xl font-bold" style={{ color: BILLING_COLORS.picking }}>
          {billingData.picking.count}
        </p>
        <p className="text-2xl font-bold" style={{ color: BILLING_COLORS.picking }}>
          ${formatBillingCurrency(billingData.picking.total_cost)}
        </p>
      </div>
    );

  const renderServices = () => {
    const services = [
      {
        name: "Wrap/Strech",
        count:
          (billingData.additional_services.wrap?.count || 0) +
          (billingData.additional_services.strech?.count || 0),
        cost:
          (billingData.additional_services.wrap?.cost || 0) +
          (billingData.additional_services.strech?.cost || 0),
      },
      {
        name: "Restiba",
        count: billingData.additional_services.restiba?.count || 0,
        cost: billingData.additional_services.restiba?.cost || 0,
      },
      {
        name: "Pallet adicional",
        count: billingData.additional_services.added_pallet?.count || 0,
        cost: billingData.additional_services.added_pallet?.cost || 0,
      },
      {
        name: "Crossdocking",
        count: billingData.additional_services.crossdocking?.count || 0,
        cost: billingData.additional_services.crossdocking?.cost || 0,
      },
    ];

    return (
      <>
        <Row>
          {services.map((service) => (
            <Col md={6} lg={3} key={service.name}>
              <Card className="h-full border-0 text-center" style={{ backgroundColor: `${BILLING_COLORS.services}08` }}>
                <Card.Body>
                  <p className="font-semibold text-slate-800">{service.name}</p>
                  <p className="text-2xl font-bold" style={{ color: BILLING_COLORS.services }}>
                    {service.count}
                  </p>
                  <p className="font-semibold">${formatBillingCurrency(service.cost)}</p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        <div className="mt-6 border-t pt-4 text-center">
          <p className="text-slate-500">Total servicios adicionales</p>
          <p className="text-2xl font-bold" style={{ color: BILLING_COLORS.services }}>
            ${formatBillingCurrency(billingData.additional_services.total_cost)}
          </p>
        </div>
      </>
    );
  };

  const renderHistory = () => (
    <>
      <h6 className="mb-3 font-semibold text-slate-800">Historial mensual (últimos 12 meses)</h6>
      {monthlyHistoryChart ? (
        <ReactApexChart
          options={monthlyHistoryChart.options}
          series={monthlyHistoryChart.series}
          type="area"
          height={350}
        />
      ) : (
        <p className="text-slate-500">Cargando historial…</p>
      )}
      {historyData ? (
        <div className="mt-4 overflow-x-auto">
          <Table hover size="sm">
            <thead>
              <tr>
                <th>Mes</th>
                <th className="text-end">Almacenamiento</th>
                <th className="text-end">Entradas</th>
                <th className="text-end">Salidas</th>
                <th className="text-end">Picking</th>
                <th className="text-end">Servicios</th>
                <th className="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              {historyData.months.map((month) => (
                <tr key={month.month}>
                  <td className="font-semibold">{month.month_name}</td>
                  <td className="text-end">
                    <CostBadge value={month.storage_cost} color={BILLING_COLORS.storage} />
                  </td>
                  <td className="text-end">
                    <CostBadge value={month.entries_cost} color={BILLING_COLORS.entries} />
                  </td>
                  <td className="text-end">
                    <CostBadge value={month.exits_cost} color={BILLING_COLORS.exits} />
                  </td>
                  <td className="text-end">
                    <CostBadge value={month.picking_cost} color={BILLING_COLORS.picking} />
                  </td>
                  <td className="text-end">
                    <CostBadge value={month.services_cost} color={BILLING_COLORS.services} />
                  </td>
                  <td className="text-end font-bold">${formatBillingCurrency(month.total_billing)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : null}
    </>
  );

  const renderAverage = () => (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-slate-100 pb-4">
        <span className="text-sm font-semibold text-slate-600">Tipo</span>
        <select
          value={storageType}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
          onChange={(e) => {
            setStorageType(e.target.value);
            setAverageData(null);
          }}
        >
          <option value="all">Todas</option>
          <option value="refrigerado">Refrigerado</option>
          <option value="congelado">Congelado</option>
          <option value="seco">Seco</option>
        </select>
        <Button variant="primary" size="sm" onClick={loadAverageData} loading={isLoadingAverage}>
          Calcular
        </Button>
      </div>

      {isLoadingAverage ? (
        <div className="py-10 text-center text-slate-500">Calculando promedio…</div>
      ) : null}

      {averageData && averageData.average_bins === 0 ? (
        <div className="py-10 text-center text-slate-500">Sin inventario en este período</div>
      ) : null}

      {averageData && averageData.average_bins > 0 ? (
        <>
          <Row className="mb-4">
            <Col md={4}>
              <Card className="border-0 bg-sky-50 text-center">
                <Card.Body>
                  <p className="text-sm text-slate-500">Días analizados</p>
                  <p className="text-3xl font-bold text-sky-600">{averageData.total_days}</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-emerald-50 text-center">
                <Card.Body>
                  <p className="text-sm text-slate-500">Promedio diario</p>
                  <p className="text-3xl font-bold text-emerald-600">
                    {Math.round(averageData.average_bins)} pallets
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="border-0 bg-amber-50 text-center">
                <Card.Body>
                  <p className="text-sm text-slate-500">Valor estimado</p>
                  <p className="text-3xl font-bold text-amber-600">
                    ${formatBillingCurrency(averageData.estimated_value)}
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {averageChartConfig ? (
            <ReactApexChart
              options={averageChartConfig.options}
              series={averageChartConfig.series}
              type="area"
              height={350}
            />
          ) : null}

          <Card className="mt-4">
            <Card.Header className="flex items-center justify-between">
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-semibold text-slate-800"
                onClick={() => setShowDailyData((v) => !v)}
              >
                Datos diarios detallados
                {showDailyData ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <Button variant="success" size="sm" icon={FileSpreadsheet} onClick={handleExportAverage}>
                Exportar
              </Button>
            </Card.Header>
            {showDailyData ? (
              <Card.Body className="max-h-[400px] overflow-auto !pt-0">
                <Table hover size="sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th>Fecha</th>
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {averageData.daily_data.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td className="text-end font-semibold">{day.bins_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            ) : null}
          </Card>
        </>
      ) : null}

      {!averageData && !isLoadingAverage ? (
        <div className="py-10 text-center text-slate-500">
          Haga clic en Calcular para ver el promedio diario de pallets almacenados.
        </div>
      ) : null}
    </>
  );

  const tabContent = {
    overview: renderOverview,
    storage: renderStorage,
    movements: renderMovements,
    picking: renderPicking,
    services: renderServices,
    history: renderHistory,
    average: renderAverage,
  };

  return (
    <Card>
      <div className="flex flex-wrap gap-1 border-b border-slate-100 px-3 pt-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = selectedTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setSelectedTab(tab.key);
                if (tab.key === "average" && !averageData) loadAverageData();
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--brand-primary)] text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[var(--brand-primary)]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
      <Card.Body>{tabContent[selectedTab]?.()}</Card.Body>
    </Card>
  );
}
