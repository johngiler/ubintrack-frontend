"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calculator,
  FileSpreadsheet,
  FileText,
  Lock,
  Zap,
} from "lucide-react";

import { Alert, Button, Card, Col, Row } from "@/components/ui/bootstrap";
import { Badge } from "@/components/ui/Badge";
import { WmsPageHeader } from "@/components/wms/WmsPageHeader";
import {
  calculateClientBilling,
  exportBillingReport,
  generateInvoice,
  getClientBillingHistory,
  getNextInvoiceNumber,
} from "@/services/financeService";
import BillingKpiCard from "../components/BillingKpiCard";
import BillingPeriodFilter from "../components/BillingPeriodFilter";
import {
  BILLING_COLORS,
  downloadBlob,
  formatBillingCurrency,
  getDefaultBillingDates,
} from "../billingUtils";
import ClientBillingTabs from "./components/ClientBillingTabs";
import InvoiceModal from "./components/InvoiceModal";

export default function ClientBillingView({ clientId }) {
  const searchParams = useSearchParams();
  const defaultDates = getDefaultBillingDates();

  const [billingData, setBillingData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [startDate, setStartDate] = useState(
    searchParams.get("start_date") || defaultDates.start,
  );
  const [endDate, setEndDate] = useState(searchParams.get("end_date") || defaultDates.end);
  const [appliedStartDate, setAppliedStartDate] = useState(
    searchParams.get("start_date") || defaultDates.start,
  );
  const [appliedEndDate, setAppliedEndDate] = useState(
    searchParams.get("end_date") || defaultDates.end,
  );

  const showAlert = useCallback((variant, message) => {
    setAlert({ show: true, variant, message });
    setTimeout(() => setAlert({ show: false, variant: "", message: "" }), 3000);
  }, []);

  const loadClientBilling = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await calculateClientBilling(clientId, appliedStartDate, appliedEndDate);
      setBillingData(data);
    } catch {
      showAlert("danger", "Error al cargar la facturación del cliente");
      setBillingData(null);
    } finally {
      setIsLoading(false);
    }
  }, [appliedStartDate, appliedEndDate, clientId, showAlert]);

  const loadClientHistory = useCallback(async () => {
    try {
      const data = await getClientBillingHistory(clientId, 12);
      setHistoryData(data);
    } catch {
      setHistoryData(null);
    }
  }, [clientId]);

  useEffect(() => {
    loadClientBilling();
    loadClientHistory();
  }, [loadClientBilling, loadClientHistory]);

  const handleApplyFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handleExportReport = async () => {
    setIsExportingReport(true);
    try {
      const blob = await exportBillingReport(clientId, appliedStartDate, appliedEndDate);
      downloadBlob(
        blob,
        `Facturacion_${billingData?.client_name || "cliente"}_${appliedStartDate}_${appliedEndDate}.xls`.replace(
          / /g,
          "_",
        ),
      );
      showAlert("success", "Reporte exportado correctamente");
    } catch {
      showAlert("danger", "Error al exportar el reporte de facturación");
    } finally {
      setIsExportingReport(false);
    }
  };

  const summaryItems = billingData
    ? [
        {
          key: "storage",
          label: "Almacenamiento",
          value: billingData.storage.total_cost,
          badge: `${billingData.storage.bins_count} pallets promedio`,
          color: BILLING_COLORS.storage,
        },
        {
          key: "entries",
          label: "Entradas",
          value: billingData.entries.total_cost,
          badge:
            billingData.tariff_type === "static"
              ? `${billingData.entries.count} (promedio × 80%)`
              : `${billingData.entries.count} bins`,
          color: BILLING_COLORS.entries,
        },
        {
          key: "exits",
          label: "Salidas",
          value: billingData.exits.total_cost,
          badge:
            billingData.tariff_type === "static"
              ? `${billingData.exits.count} (promedio × 80%)`
              : `${billingData.exits.count} bins`,
          color: BILLING_COLORS.exits,
        },
        {
          key: "picking",
          label: "Picking",
          value: billingData.picking.total_cost,
          badge:
            billingData.tariff_type === "static"
              ? "No aplica (estática)"
              : `${billingData.picking.count} items`,
          color: BILLING_COLORS.picking,
        },
        {
          key: "services",
          label: "Servicios",
          value: billingData.additional_services.total_cost,
          badge: "Wrap, Restiba",
          color: BILLING_COLORS.services,
        },
      ]
    : [];

  return (
    <Fragment>
      {alert.show ? (
        <Alert variant={alert.variant} className="mb-3">
          {alert.message}
        </Alert>
      ) : null}

      <WmsPageHeader
        title={billingData ? `Facturación — ${billingData.client_name}` : "Facturación"}
        description="Detalle de costos por cliente y período."
        icon={Calculator}
        breadcrumbs={[
          { title: "Finanzas", active: true },
          {
            title: "Calcular",
            href: `/finance/billing?start_date=${appliedStartDate}&end_date=${appliedEndDate}`,
          },
          { title: billingData?.client_name || "Cliente", active: true },
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
      ) : billingData ? (
        <>
          <Card
            className="mb-5 overflow-hidden border-0 text-white"
            style={{
              background:
                billingData.tariff_type === "static"
                  ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            <Card.Body className="p-5">
              <Row className="items-center">
                <Col md={7}>
                  <h2 className="mb-2 text-2xl font-bold">{billingData.client_name}</h2>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="mb-0 text-white/80">
                      Tarifa: <strong className="text-white">{billingData.tariff_name}</strong>
                    </p>
                    <Badge
                      variant={billingData.tariff_type === "static" ? "warning" : "success"}
                      dot={false}
                    >
                      {billingData.tariff_type === "static" ? (
                        <>
                          <Lock className="mr-1 inline h-3 w-3" /> ESTÁTICA
                        </>
                      ) : (
                        <>
                          <Zap className="mr-1 inline h-3 w-3" /> DINÁMICA
                        </>
                      )}
                    </Badge>
                  </div>
                  {billingData.rotation_percentage !== undefined ? (
                    <p className="mt-2 mb-0 text-sm text-white/70">
                      Rotación: {billingData.rotation_percentage?.toFixed(1)}%
                      {billingData.rotation_threshold ? (
                        <span> (umbral: {billingData.rotation_threshold?.toFixed(0)}%)</span>
                      ) : null}
                      {billingData.average_pallets > 0 ? (
                        <span> · Promedio: {Math.round(billingData.average_pallets)} pallets</span>
                      ) : null}
                    </p>
                  ) : null}
                </Col>
                <Col md={5} className="text-md-end">
                  <p className="mb-1 text-sm text-white/70">Facturación total estimada</p>
                  <p className="mb-0 text-3xl font-bold">
                    ${formatBillingCurrency(billingData.total_billing)}
                  </p>
                  {billingData.cost_per_pallet > 0 ? (
                    <p className="mt-1 text-sm text-white/70">
                      ${billingData.cost_per_pallet?.toFixed(2)} por pallet
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FileSpreadsheet}
                      onClick={handleExportReport}
                      loading={isExportingReport}
                    >
                      Generar reporte
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={FileText}
                      onClick={() => setShowInvoiceModal(true)}
                    >
                      Generar comprobante
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {billingData.tariff_type === "dynamic" && billingData.dynamic_details ? (
            <Alert variant="info" className="mb-4 text-sm">
              <strong>Tarifa dinámica aplicada.</strong> Se cobra sobre movimientos reales. Rotación:{" "}
              {billingData.rotation_percentage?.toFixed(1)}% (≥
              {billingData.rotation_threshold?.toFixed(0)}% umbral).
            </Alert>
          ) : null}

          {billingData.tariff_type === "static" && billingData.static_details ? (
            <Alert variant="warning" className="mb-4 text-sm">
              <strong>Tarifa estática aplicada.</strong> Se cobra sobre{" "}
              {Math.round(billingData.average_pallets)} pallets promedio. Movimientos reales ignorados:{" "}
              {billingData.static_details.actual_entries} entradas,{" "}
              {billingData.static_details.actual_exits} salidas.
            </Alert>
          ) : null}

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {summaryItems.map((item) => (
              <BillingKpiCard
                key={item.key}
                label={item.label}
                value={formatBillingCurrency(item.value)}
                badge={item.badge}
                color={item.color}
              />
            ))}
          </div>

          <ClientBillingTabs
            billingData={billingData}
            historyData={historyData}
            clientId={clientId}
            appliedStartDate={appliedStartDate}
            appliedEndDate={appliedEndDate}
            showAlert={showAlert}
          />

          <InvoiceModal
            show={showInvoiceModal}
            onHide={() => setShowInvoiceModal(false)}
            billingData={billingData}
            appliedStartDate={appliedStartDate}
            appliedEndDate={appliedEndDate}
            clientId={clientId}
            getNextInvoiceNumber={getNextInvoiceNumber}
            generateInvoice={generateInvoice}
            showAlert={showAlert}
          />
        </>
      ) : (
        <Card>
          <Card.Body className="py-12 text-center">
            <p className="text-lg font-semibold text-red-600">No se encontraron datos</p>
            <p className="text-slate-500">No se pudo obtener la información de facturación.</p>
          </Card.Body>
        </Card>
      )}
    </Fragment>
  );
}
