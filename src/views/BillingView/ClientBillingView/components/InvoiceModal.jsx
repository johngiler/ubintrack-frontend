"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";

import { Alert, Button, Col, Form, Modal, Row, Table } from "@/components/ui/bootstrap";
import {
  formatBillingCurrency,
  formatBillingDateDisplay,
} from "../../billingUtils";

export default function InvoiceModal({
  show,
  onHide,
  billingData,
  appliedStartDate,
  appliedEndDate,
  clientId,
  getNextInvoiceNumber,
  generateInvoice,
  showAlert,
}) {
  const [invoiceData, setInvoiceData] = useState({
    number: "",
    client_ruc: "",
    client_dv: "",
    client_address: "",
    vendor: "",
    comment: "",
  });
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!show || !clientId) return undefined;

    let cancelled = false;
    getNextInvoiceNumber(clientId)
      .then((response) => {
        if (cancelled) return;
        setNextInvoiceNumber(response.next_number);
        setInvoiceData({
          number: response.next_number,
          client_ruc: billingData?.client_ruc || "",
          client_dv: billingData?.client_dv || "",
          client_address: billingData?.client_address || "",
          vendor: "",
          comment: `SERVICIOS PRESTADOS EN EL MES DE ${new Date().toLocaleString("es", { month: "long" }).toUpperCase()} DE ${new Date().getFullYear()}`,
        });
      })
      .catch(() => {
        if (!cancelled) showAlert("danger", "Error al obtener el número de comprobante");
      });

    return () => {
      cancelled = true;
    };
  }, [show, clientId, billingData, getNextInvoiceNumber, showAlert]);

  const handleChange = (field, value) => {
    setInvoiceData((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    setInvoiceData({
      number: "",
      client_ruc: "",
      client_dv: "",
      client_address: "",
      vendor: "",
      comment: "",
    });
    setNextInvoiceNumber("");
    onHide();
  };

  const handleGenerate = async () => {
    if (!invoiceData.client_ruc) {
      showAlert("danger", "El RUC/Cédula es obligatorio");
      return;
    }
    if (!invoiceData.client_dv) {
      showAlert("danger", "El DV es obligatorio");
      return;
    }

    setIsGenerating(true);
    try {
      const blob = await generateInvoice(
        clientId,
        appliedStartDate,
        appliedEndDate,
        invoiceData,
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Comprobante_${invoiceData.number}_${billingData?.client_name || "cliente"}.pdf`.replace(
          / /g,
          "_",
        ),
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showAlert("success", "Comprobante generado correctamente");
      handleClose();
    } catch {
      showAlert("danger", "Error al generar el comprobante");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FileText className="mr-2 inline h-4 w-4" />
          Generar comprobante
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="mb-4 text-sm">
          Complete los datos fiscales del cliente para generar el comprobante PDF.
        </Alert>

        <Row className="gap-y-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>
                Número de comprobante <span className="text-red-500">*</span>
              </Form.Label>
              <Form.Control
                value={invoiceData.number}
                onChange={(e) => handleChange("number", e.target.value)}
                placeholder="Ej: RBCOLD0000001"
              />
              <Form.Text className="text-muted">Siguiente disponible: {nextInvoiceNumber}</Form.Text>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Cliente</Form.Label>
              <Form.Control value={billingData?.client_name || ""} readOnly disabled />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>
                RUC/Cédula <span className="text-red-500">*</span>
              </Form.Label>
              <Form.Control
                value={invoiceData.client_ruc}
                onChange={(e) => handleChange("client_ruc", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>
                DV <span className="text-red-500">*</span>
              </Form.Label>
              <Form.Control
                value={invoiceData.client_dv}
                onChange={(e) => handleChange("client_dv", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Group>
              <Form.Label>Dirección fiscal</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={invoiceData.client_address}
                onChange={(e) => handleChange("client_address", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Vendedor</Form.Label>
              <Form.Control
                value={invoiceData.vendor}
                onChange={(e) => handleChange("vendor", e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Período</Form.Label>
              <Form.Control
                value={`${formatBillingDateDisplay(appliedStartDate)} - ${formatBillingDateDisplay(appliedEndDate)}`}
                readOnly
                disabled
              />
            </Form.Group>
          </Col>
          <Col md={12}>
            <Form.Group>
              <Form.Label>Comentario</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={invoiceData.comment}
                onChange={(e) => handleChange("comment", e.target.value)}
              />
            </Form.Group>
          </Col>
        </Row>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-[var(--surface)]">
          <h6 className="mb-3 font-semibold text-slate-800 dark:text-[var(--foreground)]">
            Resumen de facturación
          </h6>
          <Table size="sm" className="mb-0">
            <tbody>
              <tr>
                <td>Almacenamiento</td>
                <td className="text-end">${formatBillingCurrency(billingData?.storage?.total_cost)}</td>
              </tr>
              <tr>
                <td>Entradas</td>
                <td className="text-end">${formatBillingCurrency(billingData?.entries?.total_cost)}</td>
              </tr>
              <tr>
                <td>Salidas</td>
                <td className="text-end">${formatBillingCurrency(billingData?.exits?.total_cost)}</td>
              </tr>
              <tr>
                <td>Picking</td>
                <td className="text-end">${formatBillingCurrency(billingData?.picking?.total_cost)}</td>
              </tr>
              <tr>
                <td>Servicios adicionales</td>
                <td className="text-end">
                  ${formatBillingCurrency(billingData?.additional_services?.total_cost)}
                </td>
              </tr>
              <tr className="border-t font-bold">
                <td>TOTAL</td>
                <td className="text-end">${formatBillingCurrency(billingData?.total_billing)}</td>
              </tr>
            </tbody>
          </Table>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="primary" icon={Download} onClick={handleGenerate} loading={isGenerating}>
          {isGenerating ? "Generando…" : "Generar PDF"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
